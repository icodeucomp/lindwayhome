import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, errorMessage, faqInclude, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { resolveTranslation, type Locale } from "@/utils";

import { CreateFaqSchema, FaqQuerySchema } from "@/types";

// GET - list FAQs. Public, so a page can pull just its own topic.
export async function GET(request: NextRequest) {
  const pathAPI = "GET /faqs";
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const queryParams = FaqQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "50",
      locale: searchParams.get("locale") || "EN",
      search: searchParams.get("search") || undefined,
      order: searchParams.get("order") || "asc",
      topic: searchParams.get("topic") || undefined,
      isActive: searchParams.get("isActive") || undefined,
    });

    const { locale, search, order, topic, isActive } = queryParams;

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.FaqWhereInput = {};

    if (topic) where.topic = topic;
    if (isActive === "true" || isActive === "false") where.isActive = isActive === "true";

    // The question lives in the translation, so search has to join it — and look at EN
    // as well as the active locale, or an untranslated entry becomes unfindable the
    // moment a visitor switches language (§B3.3). Same shape as Article.
    if (search) {
      where.OR = [{ topic: { contains: search, mode: "insensitive" } }, { translations: { some: { locale: { in: ["EN", locale] }, question: { contains: search, mode: "insensitive" } } } }];
    }

    const [faqs, total, topics] = await Promise.all([
      // Grouped by topic, then creation order within it — `Faq` has no `order` column
      // (D27), so the sequence is the sequence they were written in.
      prisma.faq.findMany({ where, include: faqInclude, orderBy: [{ topic: order }, { createdAt: "asc" }], skip, take: limit }),
      prisma.faq.count({ where }),
      // The distinct topic list powers the admin's topic filter and its input
      // suggestions, so a new entry reuses an existing topic rather than a typo of it.
      prisma.faq.findMany({ distinct: ["topic"], select: { topic: true }, orderBy: { topic: "asc" } }),
    ]);

    const data = faqs.map((faq) => ({ ...faq, ...resolveTranslation(faq.translations, locale as Locale) }));

    return NextResponse.json(
      { success: true, data, topics: topics.map((row) => row.topic), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// POST - create a FAQ
export async function POST(request: NextRequest) {
  const pathAPI = "POST /faqs";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateFaqSchema.parse(body);

    if (!data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    const faq = await prisma.faq.create({
      data: {
        // Already trimmed and lowercased by the schema.
        topic: data.topic,
        isActive: data.isActive,
        translations: {
          create: data.translations.map((translation) => ({ locale: translation.locale, question: translation.question, answer: translation.answer as Prisma.InputJsonValue })),
        },
      },
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "FAQ has been added successfully", data: faq.id });

    return NextResponse.json({ success: true, message: "FAQ has been added successfully", data: { id: faq.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
