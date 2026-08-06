import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma, sizeGuideInclude } from "@/lib";

import { resolveTranslation, type Locale } from "@/utils";

import { UpdateSizeGuideSchema } from "@/types";

// GET - one size guide
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /size-guides/${id}`;
  const startTime = Date.now();

  try {
    const locale = (new URL(request.url).searchParams.get("locale") || "EN") as Locale;

    const guide = await prisma.sizeGuide.findUnique({ where: { id }, include: sizeGuideInclude });

    if (!guide) {
      logger.error(`${pathAPI} error`, { error: "Size guide not found" });
      return NextResponse.json({ success: false, message: "Size guide not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { ...guide, ...resolveTranslation(guide.translations, locale) } }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// PUT - update a size guide
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /size-guides/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = UpdateSizeGuideSchema.parse(body);

    const existing = await prisma.sizeGuide.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "Size guide not found" });
      return NextResponse.json({ success: false, message: "Size guide not found" }, { status: 404 });
    }

    if (data.translations && !data.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    // Rows and translations are replaced wholesale: the admin form always submits
    // the complete set, and removing a row has to actually delete it.
    await prisma.$transaction(async (tx) => {
      if (data.rows) await tx.sizeGuideRow.deleteMany({ where: { sizeGuideId: id } });
      if (data.translations) await tx.sizeGuideTranslation.deleteMany({ where: { sizeGuideId: id } });

      await tx.sizeGuide.update({
        where: { id },
        data: {
          ...(data.order !== undefined ? { order: data.order } : {}),
          ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt } : {}),
          ...(data.rows ? { rows: { create: data.rows.map((row) => ({ sizeId: row.sizeId, measurements: row.measurements })) } } : {}),
          ...(data.translations
            ? {
                translations: {
                  create: data.translations.map((translation) => ({
                    locale: translation.locale,
                    title: translation.title,
                    description: translation.description ?? undefined,
                    parameterLabels: translation.parameterLabels ?? undefined,
                  })),
                },
              }
            : {}),
        },
      });
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Size guide has been updated successfully" });

    return NextResponse.json({ success: true, message: "Size guide has been updated successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// DELETE - refused while products still point at the guide
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /size-guides/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const guide = await prisma.sizeGuide.findUnique({ where: { id }, select: { id: true, _count: { select: { products: true } } } });

    if (!guide) {
      logger.error(`${pathAPI} error`, { error: "Size guide not found" });
      return NextResponse.json({ success: false, message: "Size guide not found" }, { status: 404 });
    }

    if (guide._count.products > 0) {
      logger.error(`${pathAPI} error`, { error: "Size guide is in use" });
      return NextResponse.json(
        { success: false, message: `${guide._count.products} product(s) use this size guide. Reassign them first, or unpublish it instead of deleting.` },
        { status: 400 },
      );
    }

    await prisma.sizeGuide.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Size guide deleted successfully" });

    return NextResponse.json({ success: true, message: "Size guide deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
