import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { checkAuth, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { UpdateSizeSchema } from "@/types";

// PUT - update a size
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /sizes/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = UpdateSizeSchema.parse(body);

    const existing = await prisma.size.findUnique({ where: { id } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "Size not found" });
      return NextResponse.json({ success: false, message: "Size not found" }, { status: 404 });
    }

    const code = data.code?.toUpperCase();

    if (code && code !== existing.code) {
      const conflict = await prisma.size.findUnique({ where: { code }, select: { id: true } });
      if (conflict) {
        logger.error(`${pathAPI} error`, { error: "Size code already exists" });
        return NextResponse.json({ success: false, message: `Size "${code}" already exists` }, { status: 400 });
      }

      // Renaming a code silently breaks the package_dimensions lookup and every
      // order line that stored the old string, so it is refused once the size is
      // in use rather than left to surface at checkout.
      const inUse = await prisma.productVariant.count({ where: { sizeId: id } });
      if (inUse > 0) {
        logger.error(`${pathAPI} error`, { error: "Cannot rename a size that products use" });
        return NextResponse.json(
          { success: false, message: `"${existing.code}" is used by ${inUse} product variant(s). Deactivate it and create a new size instead of renaming it.` },
          { status: 400 },
        );
      }
    }

    await prisma.size.update({ where: { id }, data: { ...data, ...(code ? { code } : {}) } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Size has been updated successfully" });

    return NextResponse.json({ success: true, message: "Size has been updated successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// DELETE - only when nothing references the size
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /sizes/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const size = await prisma.size.findUnique({
      where: { id },
      select: { id: true, code: true, _count: { select: { variants: true, guideRows: true } } },
    });

    if (!size) {
      logger.error(`${pathAPI} error`, { error: "Size not found" });
      return NextResponse.json({ success: false, message: "Size not found" }, { status: 404 });
    }

    if (size._count.variants > 0 || size._count.guideRows > 0) {
      await prisma.size.update({ where: { id }, data: { isActive: false } });

      const message = `"${size.code}" is used by ${size._count.variants} variant(s) and ${size._count.guideRows} size guide row(s), so it was deactivated instead of deleted.`;
      logResponse(pathAPI, Date.now() - startTime, { message });
      return NextResponse.json({ success: true, message }, { status: 200 });
    }

    await prisma.size.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Size deleted successfully" });

    return NextResponse.json({ success: true, message: "Size deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
