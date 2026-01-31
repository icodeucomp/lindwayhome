import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticate, authorize, logger, prisma } from "@/lib";

import { Prisma } from "prisma-client/client";

import { CreateLocationSchema, LocationQuerySchema } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const queryParams = LocationQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      search: searchParams.get("search") || undefined,
      province: searchParams.get("province") || undefined,
      district: searchParams.get("district") || undefined,
      sub_district: searchParams.get("sub_district") || undefined,
    });

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.LocationWhereInput = {};

    if (queryParams.search) {
      where.OR = [
        { province: { contains: queryParams.search, mode: "insensitive" } },
        { district: { contains: queryParams.search, mode: "insensitive" } },
        { sub_district: { contains: queryParams.search, mode: "insensitive" } },
        { village: { contains: queryParams.search, mode: "insensitive" } },
        { code: { contains: queryParams.search, mode: "insensitive" } },
      ];
    }

    if (queryParams.province) {
      where.province = { contains: queryParams.province, mode: "insensitive" };
    }

    if (queryParams.district) {
      where.district = { contains: queryParams.district, mode: "insensitive" };
    }

    if (queryParams.sub_district) {
      where.sub_district = { contains: queryParams.sub_district, mode: "insensitive" };
    }

    const totalItems = await prisma.location.count({ where });

    const locations = await prisma.location.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ code: "asc" }, { province: "asc" }, { district: "asc" }, { sub_district: "asc" }, { village: "asc" }],
    });

    return NextResponse.json(
      {
        success: true,
        data: locations.map((location) => ({
          ...location,
          approx_lat: location.approx_lat.toNumber(),
          approx_long: location.approx_long.toNumber(),
        })),

        pagination: { page, limit, total: totalItems, totalPages: Math.ceil(totalItems / limit) },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("API /locations error", { error: error.message, stack: error.stack });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /locations error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /locations", {
      method: request.method,
      body: body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    const validatedData = CreateLocationSchema.parse(body);

    const existingLocation = await prisma.location.findUnique({
      where: { code: validatedData.code },
    });

    if (existingLocation) {
      logger.error("API /locations error", { error: `Location with code "${validatedData.code}" already exists` });
      return NextResponse.json({ success: false, message: `Location with code "${validatedData.code}" already exists` }, { status: 409 });
    }

    const location = await prisma.location.create({ data: validatedData });

    logger.info("API Response /locations", {
      message: "Location created successfully",
      durationMs: Date.now() - start,
      data: {
        ...location,
        approx_lat: location.approx_lat.toNumber(),
        approx_long: location.approx_long.toNumber(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Location created successfully",
        data: {
          ...location,
          approx_lat: location.approx_lat.toNumber(),
          approx_long: location.approx_long.toNumber(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("API /locations error", { error: error.message, stack: error.stack });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /locations error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
