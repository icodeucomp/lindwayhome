import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { articleInclude, checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma, resolveFiles } from "@/lib";

import { resolveTranslation, type Locale } from "@/utils";

import { UpdateArticleSchema } from "@/types";

// GET - one article by id or slug
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /articles/${id}`;
  const startTime = Date.now();

  try {
    const locale = (new URL(request.url).searchParams.get("locale") || "EN") as Locale;

    // Public pages address articles by slug (D4); the admin uses the id.
    const article = await prisma.article.findFirst({ where: { OR: [{ id }, { slug: id }] }, include: articleInclude });

    if (!article) {
      logger.error(`${pathAPI} error`, { error: "Article not found" });
      return NextResponse.json({ success: false, message: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...article,
          ...resolveTranslation(article.translations, locale),
          category: { ...article.category, ...resolveTranslation(article.category.translations, locale) },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// PUT - update an article
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /articles/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = UpdateArticleSchema.parse(body);

    const existing = await prisma.article.findUnique({ where: { id }, select: { id: true, slug: true, image: true } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "Article not found" });
      return NextResponse.json({ success: false, message: "Article not found" }, { status: 404 });
    }

    if (data.translations && !data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await prisma.article.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (conflict) {
        logger.error(`${pathAPI} error`, { error: "Slug already exists" });
        return NextResponse.json({ success: false, message: "An article with this slug already exists" }, { status: 400 });
      }
    }

    // `resolveFiles` moves anything still in temp and deletes what the previous value
    // had but the new one does not — that is how replacing the cover image works.
    const folder = `articles/${data.slug ?? existing.slug}`;
    const resolvedImage = data.image ? ((await resolveFiles([existing.image], [data.image], folder)) as unknown as Prisma.InputJsonValue[])[0] : undefined;

    await prisma.$transaction(async (tx) => {
      if (data.translations) await tx.articleTranslation.deleteMany({ where: { articleId: id } });

      await tx.article.update({
        where: { id },
        data: {
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          ...(data.authorId !== undefined ? { authorId: data.authorId ?? null } : {}),
          ...(resolvedImage !== undefined ? { image: resolvedImage } : {}),
          ...(data.imageAlt !== undefined ? { imageAlt: data.imageAlt ?? null } : {}),
          ...(data.featured !== undefined ? { featured: data.featured } : {}),
          ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt ?? null } : {}),
          ...(data.translations
            ? {
                translations: {
                  create: data.translations.map((translation) => ({
                    locale: translation.locale,
                    title: translation.title,
                    excerpt: translation.excerpt ?? undefined,
                    content: translation.content as Prisma.InputJsonValue,
                  })),
                },
              }
            : {}),
        },
      });
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Article has been updated successfully" });

    return NextResponse.json({ success: true, message: "Article has been updated successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// DELETE - an article has no downstream references, so it really is removed
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /articles/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const article = await prisma.article.findUnique({ where: { id }, select: { id: true, slug: true, image: true } });

    if (!article) {
      logger.error(`${pathAPI} error`, { error: "Article not found" });
      return NextResponse.json({ success: false, message: "Article not found" }, { status: 404 });
    }

    // Drop the cover image too, or the uploads folder accumulates files nothing
    // references. Translations go with the cascade.
    await resolveFiles([article.image], [], `articles/${article.slug}`);
    await prisma.article.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Article deleted successfully" });

    return NextResponse.json({ success: true, message: "Article deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
