import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma, sizeGuideInclude } from "@/lib";

import { resolveTranslation, type Locale } from "@/utils";

import { CreateSizeGuideSchema } from "@/types";

// GET - list size guides. `published=true` is what the public page asks for (F-41).
export async function GET(request: NextRequest) {
  const pathAPI = "GET /size-guides";
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") || "EN") as Locale;
    const publishedOnly = searchParams.get("published") === "true";

    const guides = await prisma.sizeGuide.findMany({
      where: publishedOnly ? { publishedAt: { not: null } } : {},
      include: sizeGuideInclude,
      // No `order` column: creation sequence is the sequence. Not alphabetical by the
      // translated title, which would reshuffle the page when a visitor switches language.
      orderBy: { createdAt: "asc" },
    });

    const data = guides.map((guide) => ({ ...guide, ...resolveTranslation(guide.translations, locale) }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// POST - create a size guide
export async function POST(request: NextRequest) {
  const pathAPI = "POST /size-guides";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateSizeGuideSchema.parse(body);

    if (!data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    const guide = await prisma.sizeGuide.create({
      data: {
        publishedAt: data.publishedAt ?? undefined,
        rows: { create: data.rows.map((row) => ({ sizeId: row.sizeId, measurements: row.measurements })) },
        translations: {
          create: data.translations.map((translation) => ({
            locale: translation.locale,
            title: translation.title,
            description: translation.description ?? undefined,
            parameterLabels: translation.parameterLabels ?? undefined,
          })),
        },
      },
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Size guide has been added successfully", data: guide.id });

    return NextResponse.json({ success: true, message: "Size guide has been added successfully", data: { id: guide.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
