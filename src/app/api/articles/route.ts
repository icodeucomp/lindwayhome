import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { articleInclude, checkAuth, errorMessage, FileUploader, getClientIp, logError, logger, logRequest, logResponse, prisma, resolveFiles } from "@/lib";

import { buildDateFilter, resolveTranslation, type Locale } from "@/utils";

import { ArticleQuerySchema, CreateArticleSchema } from "@/types";

const uploader = new FileUploader();

// GET - list articles
export async function GET(request: NextRequest) {
  const pathAPI = "GET /articles";
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const queryParams = ArticleQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      locale: searchParams.get("locale") || "EN",
      search: searchParams.get("search") || undefined,
      order: searchParams.get("order") || "desc",
      categoryId: searchParams.get("categoryId") || undefined,
      featured: searchParams.get("featured") || undefined,
      published: searchParams.get("published") || undefined,
      year: searchParams.get("year") || undefined,
      month: searchParams.get("month") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });

    const { locale, search, order, categoryId, featured, published, year, month, dateFrom, dateTo } = queryParams;

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.ArticleWhereInput = {};

    if (categoryId) where.categoryId = categoryId;
    if (featured === "true" || featured === "false") where.featured = featured === "true";
    // The public Journal passes published=true; the admin passes nothing and sees drafts too.
    if (published === "true") where.publishedAt = { not: null };
    else if (published === "false") where.publishedAt = null;

    // The title lives in the translation, so search has to join it — and look at EN
    // as well as the active locale, or an untranslated article becomes unfindable the
    // moment a visitor switches language (§B3.3). Product avoids this via D26; Article
    // cannot, because its title IS the translation.
    if (search) {
      where.OR = [{ slug: { contains: search, mode: "insensitive" } }, { translations: { some: { locale: { in: ["EN", locale] }, title: { contains: search, mode: "insensitive" } } } }];
    }

    const dateFilter = buildDateFilter({ year, month, dateFrom, dateTo });
    if (dateFilter) where.createdAt = dateFilter;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: articleInclude,
        // Published first by recency, then drafts — an admin opening this screen is
        // usually looking for the thing they were last working on.
        orderBy: [{ publishedAt: { sort: order, nulls: "first" } }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    const data = articles.map((article) => ({
      ...article,
      ...resolveTranslation(article.translations, locale as Locale),
      category: { ...article.category, ...resolveTranslation(article.category.translations, locale as Locale) },
    }));

    return NextResponse.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// POST - create an article
export async function POST(request: NextRequest) {
  const pathAPI = "POST /articles";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateArticleSchema.parse(body);

    if (!data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    const [slugTaken, category] = await Promise.all([
      prisma.article.findUnique({ where: { slug: data.slug }, select: { id: true } }),
      prisma.articleCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
    ]);

    if (slugTaken) {
      logger.error(`${pathAPI} error`, { error: "Slug already exists" });
      return NextResponse.json({ success: false, message: "An article with this slug already exists" }, { status: 400 });
    }
    if (!category) {
      logger.error(`${pathAPI} error`, { error: "Category not found" });
      return NextResponse.json({ success: false, message: "That article category no longer exists" }, { status: 400 });
    }

    // Same two-phase upload as product images (§A5.5): the file sits in temp until
    // the record is saved, so abandoning the form leaves nothing but sweepable temp.
    const folder = `articles/${data.slug}`;
    const image = data.image.isMoved ? data.image : await uploader.moveFromTemp(data.image, folder);
    const [resolvedImage] = (await resolveFiles([], [image], folder)) as unknown as Prisma.InputJsonValue[];

    const article = await prisma.article.create({
      data: {
        slug: data.slug,
        categoryId: data.categoryId,
        authorId: data.authorId ?? undefined,
        image: resolvedImage,
        imageAlt: data.imageAlt ?? undefined,
        featured: data.featured,
        publishedAt: data.publishedAt ?? undefined,
        translations: {
          create: data.translations.map((translation) => ({
            locale: translation.locale,
            title: translation.title,
            excerpt: translation.excerpt ?? undefined,
            content: translation.content as Prisma.InputJsonValue,
          })),
        },
      },
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Article has been added successfully", data: article.id });

    return NextResponse.json({ success: true, message: "Article has been added successfully", data: { id: article.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
