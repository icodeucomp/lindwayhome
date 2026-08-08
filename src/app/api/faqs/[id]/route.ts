import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, errorMessage, faqInclude, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { resolveTranslation, type Locale } from "@/utils";

import { UpdateFaqSchema } from "@/types";

// GET - one FAQ
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /faqs/${id}`;
  const startTime = Date.now();

  try {
    const locale = (new URL(request.url).searchParams.get("locale") || "EN") as Locale;

    const faq = await prisma.faq.findUnique({ where: { id }, include: faqInclude });

    if (!faq) {
      logger.error(`${pathAPI} error`, { error: "FAQ not found" });
      return NextResponse.json({ success: false, message: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { ...faq, ...resolveTranslation(faq.translations, locale) } });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// PUT - update an FAQ
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /faqs/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = UpdateFaqSchema.parse(body);

    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "FAQ not found" });
      return NextResponse.json({ success: false, message: "FAQ not found" }, { status: 404 });
    }

    if (data.translations && !data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "Missing EN translation" });
      return NextResponse.json({ success: false, message: "An English translation is required" }, { status: 400 });
    }

    const faq = await prisma.$transaction(async (tx) => {
      // Translations are replaced wholesale rather than upserted, so removing the ID
      // row actually removes it — an upsert-only path would leave it behind forever.
      if (data.translations) {
        await tx.faqTranslation.deleteMany({ where: { faqId: id } });
      }

      return tx.faq.update({
        where: { id },
        data: {
          topic: data.topic,
          isActive: data.isActive,
          ...(data.translations ? { translations: { create: data.translations.map((translation) => ({ ...translation, answer: translation.answer as Prisma.InputJsonValue })) } } : {}),
        },
        include: faqInclude,
      });
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "FAQ updated" });
    return NextResponse.json({ success: true, message: "FAQ updated", data: faq });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} validation error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => issue.message) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// DELETE - remove an FAQ
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /faqs/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "FAQ not found" });
      return NextResponse.json({ success: false, message: "FAQ not found" }, { status: 404 });
    }

    // Translations cascade with the row, so no explicit cleanup is needed.
    await prisma.faq.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "FAQ deleted" });
    return NextResponse.json({ success: true, message: "FAQ deleted" });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
