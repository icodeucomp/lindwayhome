import { NextRequest, NextResponse } from "next/server";

import z from "zod";

import { authenticate, authorize, logger, prisma } from "@/lib";

import { UpdateLocationSchema } from "@/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticationResult = await authenticate(request);
  const authorizationResult = await authorize(request, "ADMIN");
  if (authenticationResult.message) {
    logger.error("API /locations error", { error: authenticationResult.message });
    return NextResponse.json({ success: false, message: authenticationResult.message }, { status: authenticationResult.status });
  }
  if (authorizationResult.message) {
    logger.error("API /locations error", { error: authorizationResult.message });
    return NextResponse.json({ success: false, message: authorizationResult.message }, { status: authorizationResult.status });
  }

  try {
    const { id } = await params;

    const location = await prisma.location.findUnique({ where: { id } });

    if (!location) {
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...location,
          approx_lat: location.approx_lat.toNumber(),
          approx_long: location.approx_long.toNumber(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /locations/[id] error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticationResult = await authenticate(request);
  const authorizationResult = await authorize(request, "ADMIN");
  if (authenticationResult.message) {
    logger.error("API /locations/[id] error", { error: authenticationResult.message });
    return NextResponse.json({ success: false, message: authenticationResult.message }, { status: authenticationResult.status });
  }
  if (authorizationResult.message) {
    logger.error("API /locations/[id] error", { error: authorizationResult.message });
    return NextResponse.json({ success: false, message: authorizationResult.message }, { status: authorizationResult.status });
  }

  try {
    const { id } = await params;

    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /locations/[id]", {
      method: request.method,
      body: body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    const validatedData = UpdateLocationSchema.parse(body);

    const existingLocation = await prisma.location.findUnique({ where: { id } });

    if (!existingLocation) {
      logger.error("API /locations/[id] error", { error: "Location not found" });
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    if (validatedData.code && validatedData.code !== existingLocation.code) {
      const codeExists = await prisma.location.findUnique({ where: { code: validatedData.code } });

      if (codeExists) {
        logger.error("API /locations/[id] error", { error: `Location with code "${validatedData.code}" already exists` });
        return NextResponse.json({ success: false, message: `Location with code "${validatedData.code}" already exists` }, { status: 409 });
      }
    }

    const updatedLocation = await prisma.location.update({ where: { id }, data: validatedData });

    logger.info("API Response /locations[id]", {
      message: "Location created successfully",
      durationMs: Date.now() - start,
      data: {
        ...updatedLocation,
        approx_lat: updatedLocation.approx_lat.toNumber(),
        approx_long: updatedLocation.approx_long.toNumber(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Location updated successfully",
        data: {
          ...updatedLocation,
          approx_lat: updatedLocation.approx_lat.toNumber(),
          approx_long: updatedLocation.approx_long.toNumber(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("API /locations/[id] error", { error: error.message, stack: error.stack });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /locations/[id] error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticationResult = await authenticate(request);
  const authorizationResult = await authorize(request, "ADMIN");
  if (authenticationResult.message) {
    logger.error("API /locations error", { error: authenticationResult.message });
    return NextResponse.json({ success: false, message: authenticationResult.message }, { status: authenticationResult.status });
  }
  if (authorizationResult.message) {
    logger.error("API /locations error", { error: authorizationResult.message });
    return NextResponse.json({ success: false, message: authorizationResult.message }, { status: authorizationResult.status });
  }

  try {
    const { id } = await params;

    const existingLocation = await prisma.location.findUnique({ where: { id } });

    if (!existingLocation) {
      logger.error("API /locations/[id] error", { error: "Location not found" });
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    await prisma.location.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Location deleted successfully" }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /locations/[id] error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
