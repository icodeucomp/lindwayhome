import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, errorMessage, faqInclude, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { resolveTranslation, type Locale } from "@/utils";

import { CreateFaqSchema } from "@/types";

/**
 * GET is public — the FAQ page renders it (F-44). POST requires admin.
 *
 * `topic` groups FAQs so one component can serve several pages; the public page passes
 * no topic and renders every active entry grouped by it.
 */

// GET - list FAQs
export async function GET(request: NextRequest) {
  const pathAPI = "GET /faqs";
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") || "EN") as Locale;
    const topic = searchParams.get("topic") || undefined;
    const activeParam = searchParams.get("isActive");

    const where: Prisma.FaqWhereInput = {};
    if (topic) where.topic = topic;
    // Absent means both, so the admin list can show deactivated entries; the public
    // page passes isActive=true explicitly.
    if (activeParam === "true" || activeParam === "false") where.isActive = activeParam === "true";

    const faqs = await prisma.faq.findMany({
      where,
      include: faqInclude,
      // Creation sequence within a topic, not the translated question — sorting by the
      // question would reshuffle the page when a visitor switches language.
      orderBy: [{ topic: "asc" }, { createdAt: "asc" }],
    });

    const data = faqs.map((faq) => ({ ...faq, ...resolveTranslation(faq.translations, locale) }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// POST - create an FAQ
export async function POST(request: NextRequest) {
  const pathAPI = "POST /faqs";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateFaqSchema.parse(body);

    // An ID-only row is unreachable for English visitors, because the per-field
    // fallback runs ID → EN (§B4 invariants).
    if (!data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "Missing EN translation" });
      return NextResponse.json({ success: false, message: "An English translation is required" }, { status: 400 });
    }

    const faq = await prisma.faq.create({
      data: {
        topic: data.topic,
        isActive: data.isActive ?? true,
        translations: { create: data.translations.map((translation) => ({ ...translation, answer: translation.answer as Prisma.InputJsonValue })) },
      },
      include: faqInclude,
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "FAQ created" });
    return NextResponse.json({ success: true, message: "FAQ created", data: faq }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} validation error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => issue.message) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
