import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { articleCategoryInclude, checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { resolveTranslation, type Locale } from "@/utils";

import { UpdateArticleCategorySchema } from "@/types";

// GET - one category by id or slug
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /article-categories/${id}`;
  const startTime = Date.now();

  try {
    const locale = (new URL(request.url).searchParams.get("locale") || "EN") as Locale;

    // Public pages address categories by slug (D4); the admin uses the id.
    const category = await prisma.articleCategory.findFirst({ where: { OR: [{ id }, { slug: id }] }, include: articleCategoryInclude });

    if (!category) {
      logger.error(`${pathAPI} error`, { error: "Article category not found" });
      return NextResponse.json({ success: false, message: "Article category not found" }, { status: 404 });
    }

    const { _count, ...rest } = category;

    return NextResponse.json({ success: true, data: { ...rest, ...resolveTranslation(category.translations, locale), articleCount: _count.articles } }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// PUT - update a category
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /article-categories/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = UpdateArticleCategorySchema.parse(body);

    const existing = await prisma.articleCategory.findUnique({ where: { id }, select: { id: true, slug: true } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "Article category not found" });
      return NextResponse.json({ success: false, message: "Article category not found" }, { status: 404 });
    }

    if (data.translations && !data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    if (data.slug && data.slug !== existing.slug) {
      const conflict = await prisma.articleCategory.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (conflict) {
        logger.error(`${pathAPI} error`, { error: "Slug already exists" });
        return NextResponse.json({ success: false, message: "A category with this slug already exists" }, { status: 400 });
      }
    }

    // Translations are replaced wholesale — the form always submits the complete set,
    // and dropping the Indonesian row has to actually remove it.
    await prisma.$transaction(async (tx) => {
      if (data.translations) await tx.articleCategoryTranslation.deleteMany({ where: { categoryId: id } });

      await tx.articleCategory.update({
        where: { id },
        data: {
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.order !== undefined ? { order: data.order } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.translations
            ? { translations: { create: data.translations.map((translation) => ({ locale: translation.locale, name: translation.name, description: translation.description ?? undefined })) } }
            : {}),
        },
      });
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Article category has been updated successfully" });

    return NextResponse.json({ success: true, message: "Article category has been updated successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// DELETE - refused while articles still point at it
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /article-categories/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const category = await prisma.articleCategory.findUnique({ where: { id }, select: { id: true, _count: { select: { articles: true } } } });

    if (!category) {
      logger.error(`${pathAPI} error`, { error: "Article category not found" });
      return NextResponse.json({ success: false, message: "Article category not found" }, { status: 404 });
    }

    // `Article.categoryId` is required, so there is no "uncategorised" to fall back
    // to — deleting would orphan the articles and the foreign key would refuse
    // anyway. Deactivating instead is not offered here because the admin may have
    // meant either; making them choose is clearer than guessing.
    if (category._count.articles > 0) {
      logger.error(`${pathAPI} error`, { error: "Category still has articles" });
      return NextResponse.json(
        { success: false, message: `This category still has ${category._count.articles} article(s). Move them to another category first, or deactivate this one instead.` },
        { status: 400 },
      );
    }

    await prisma.articleCategory.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Article category deleted successfully" });

    return NextResponse.json({ success: true, message: "Article category deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
