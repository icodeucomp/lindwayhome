import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { CreateLocationSchema, LocationQuerySchema } from "@/types";

// GET - Fetch all locations
export async function GET(request: NextRequest) {
  const pathAPI = `GET /locations`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

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

    const { search, province, district, sub_district } = queryParams;

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.LocationWhereInput = {};

    if (search) {
      where.OR = [
        { province: { contains: search, mode: "insensitive" } },
        { district: { contains: search, mode: "insensitive" } },
        { sub_district: { contains: search, mode: "insensitive" } },
        { village: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (province) {
      where.province = { contains: province, mode: "insensitive" };
    }

    if (district) {
      where.district = { contains: district, mode: "insensitive" };
    }

    if (sub_district) {
      where.sub_district = { contains: sub_district, mode: "insensitive" };
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
        data: locations.map((location) => ({ ...location, approx_lat: location.approx_lat.toNumber(), approx_long: location.approx_long.toNumber() })),
        pagination: { page, limit, total: totalItems, totalPages: Math.ceil(totalItems / limit) },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// POST - Create a new location
export async function POST(request: NextRequest) {
  const pathAPI = `POST /locations`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const validatedData = CreateLocationSchema.parse(body);

    const existingLocation = await prisma.location.findUnique({
      where: { code: validatedData.code },
    });

    if (existingLocation) {
      logger.error("API /locations error", { error: `Location with code "${validatedData.code}" already exists` });
      return NextResponse.json({ success: false, message: `Location with code "${validatedData.code}" already exists` }, { status: 409 });
    }

    const location = await prisma.location.create({ data: validatedData });

    logResponse(pathAPI, Date.now() - startTime, {
      message: "Location created successfully",
      data: { ...location, approx_lat: location.approx_lat.toNumber(), approx_long: location.approx_long.toNumber() },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Location created successfully",
        data: { ...location, approx_lat: location.approx_lat.toNumber(), approx_long: location.approx_long.toNumber() },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
