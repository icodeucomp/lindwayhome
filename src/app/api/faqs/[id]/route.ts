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

    return NextResponse.json({ success: true, data: { ...faq, ...resolveTranslation(faq.translations, locale) } }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// PUT - update a FAQ
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

    const existing = await prisma.faq.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "FAQ not found" });
      return NextResponse.json({ success: false, message: "FAQ not found" }, { status: 404 });
    }

    if (data.translations && !data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    // Translations are replaced wholesale — the form always submits the complete set,
    // and dropping the Indonesian row has to actually remove it.
    await prisma.$transaction(async (tx) => {
      if (data.translations) await tx.faqTranslation.deleteMany({ where: { faqId: id } });

      await tx.faq.update({
        where: { id },
        data: {
          ...(data.topic !== undefined ? { topic: data.topic } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.translations
            ? {
                translations: {
                  create: data.translations.map((translation) => ({ locale: translation.locale, question: translation.question, answer: translation.answer as Prisma.InputJsonValue })),
                },
              }
            : {}),
        },
      });
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "FAQ has been updated successfully" });

    return NextResponse.json({ success: true, message: "FAQ has been updated successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// DELETE - nothing references a FAQ, so it really is removed
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /faqs/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const faq = await prisma.faq.findUnique({ where: { id }, select: { id: true } });

    if (!faq) {
      logger.error(`${pathAPI} error`, { error: "FAQ not found" });
      return NextResponse.json({ success: false, message: "FAQ not found" }, { status: 404 });
    }

    // Translations go with the cascade; there are no files and no downstream rows.
    await prisma.faq.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "FAQ deleted successfully" });

    return NextResponse.json({ success: true, message: "FAQ deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
