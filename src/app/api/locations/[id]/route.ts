import { NextRequest, NextResponse } from "next/server";

import z from "zod";

import { checkAuth, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { UpdateLocationSchema } from "@/types";

// GET - Fetch one location by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /locations/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const location = await prisma.location.findUnique({ where: { id } });

    if (!location) {
      logger.error(`${pathAPI} error`, { error: "Location not found" });
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: { ...location, approx_lat: location.approx_lat.toNumber(), approx_long: location.approx_long.toNumber() },
      },
      { status: 200 },
    );
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// PUT - Update a location by ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /locations/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const validatedData = UpdateLocationSchema.parse(body);

    const existingLocation = await prisma.location.findUnique({ where: { id } });

    if (!existingLocation) {
      logger.error(`${pathAPI} error`, { error: "Location not found" });
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    if (validatedData.code && validatedData.code !== existingLocation.code) {
      const codeExists = await prisma.location.findUnique({ where: { code: validatedData.code } });

      if (codeExists) {
        logger.error(`${pathAPI} error`, { error: `Location with code "${validatedData.code}" already exists` });
        return NextResponse.json({ success: false, message: `Location with code "${validatedData.code}" already exists` }, { status: 409 });
      }
    }

    const updatedLocation = await prisma.location.update({ where: { id }, data: validatedData });

    logResponse(pathAPI, Date.now() - startTime, {
      message: "Location updated successfully",
      data: { ...updatedLocation, approx_lat: updatedLocation.approx_lat.toNumber(), approx_long: updatedLocation.approx_long.toNumber() },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Location updated successfully",
        data: { ...updatedLocation, approx_lat: updatedLocation.approx_lat.toNumber(), approx_long: updatedLocation.approx_long.toNumber() },
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

// DELETE - Delete a location by ID
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /locations/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const existingLocation = await prisma.location.findUnique({ where: { id } });

    if (!existingLocation) {
      logger.error(`${pathAPI} error`, { error: "Location not found" });
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    await prisma.location.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Location deleted successfully" });

    return NextResponse.json({ success: true, message: "Location deleted successfully" }, { status: 201 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
