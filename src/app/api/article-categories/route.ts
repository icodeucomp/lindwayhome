import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { articleCategoryInclude, checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { resolveTranslation, type Locale } from "@/utils";

import { CreateArticleCategorySchema } from "@/types";

// GET - list article categories. Public, so the Journal page can render its filters.
export async function GET(request: NextRequest) {
  const pathAPI = "GET /article-categories";
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") || "EN") as Locale;
    const activeOnly = searchParams.get("isActive") === "true";

    const categories = await prisma.articleCategory.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: articleCategoryInclude,
      orderBy: { order: "asc" },
    });

    const data = categories.map(({ _count, ...category }) => ({ ...category, ...resolveTranslation(category.translations, locale), articleCount: _count.articles }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// POST - create an article category
export async function POST(request: NextRequest) {
  const pathAPI = "POST /article-categories";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateArticleCategorySchema.parse(body);

    // The name lives only in the translation, so without an EN row the category is
    // nameless for English visitors and the ID → EN fallback has nothing to land on.
    if (!data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    const taken = await prisma.articleCategory.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (taken) {
      logger.error(`${pathAPI} error`, { error: "Slug already exists" });
      return NextResponse.json({ success: false, message: "A category with this slug already exists" }, { status: 400 });
    }

    const category = await prisma.articleCategory.create({
      data: {
        slug: data.slug,
        order: data.order,
        isActive: data.isActive,
        translations: {
          create: data.translations.map((translation) => ({ locale: translation.locale, name: translation.name, description: translation.description ?? undefined })),
        },
      },
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Article category has been added successfully", data: category.id });

    return NextResponse.json({ success: true, message: "Article category has been added successfully", data: { id: category.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
