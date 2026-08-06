import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { checkAuth, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { CreateSizeSchema } from "@/types";

// GET - all sizes. Public: the storefront size picker and size guide both need it.
export async function GET(request: NextRequest) {
  const pathAPI = "GET /sizes";
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const sizes = await prisma.size.findMany({
      where: isActive === "true" || isActive === "false" ? { isActive: isActive === "true" } : {},
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ success: true, data: sizes }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// POST - create a size
export async function POST(request: NextRequest) {
  const pathAPI = "POST /sizes";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateSizeSchema.parse(body);
    const code = data.code.toUpperCase();

    const existing = await prisma.size.findUnique({ where: { code }, select: { id: true } });
    if (existing) {
      logger.error(`${pathAPI} error`, { error: "Size code already exists" });
      return NextResponse.json({ success: false, message: `Size "${code}" already exists` }, { status: 400 });
    }

    const size = await prisma.size.create({ data: { ...data, code } });

    // Not an error, but the admin needs to know: without a matching
    // package_dimensions key, checkout 404s for this size (§B4.2). Warning here
    // beats the buyer discovering it at the payment step.
    const dimensions = await prisma.configParameter.findFirst({
      where: { key: code, group: { name: "package_dimensions" } },
      select: { id: true },
    });

    const message = dimensions
      ? "Size has been added successfully"
      : `Size "${code}" was created, but it has no package_dimensions entry yet. Add one under Parameters, or checkout will fail for this size.`;

    logResponse(pathAPI, Date.now() - startTime, { message, data: size });

    return NextResponse.json({ success: true, message, data: { ...size, missingDimensions: !dimensions } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
