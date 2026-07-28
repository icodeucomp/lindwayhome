import { NextRequest, NextResponse } from "next/server";

import { checkAuth, getClientIp, logError, logRequest, logResponse, resolveFiles } from "@/lib";

import { ConfigService } from "@/services";

// GET - Fetch all configuration parameters
export async function GET(request: NextRequest) {
  const pathAPI = "GET /config/parameters";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const configParameters = await ConfigService.getAllConfigs();
    return NextResponse.json({ success: true, data: configParameters }, { status: 200 });
  } catch (error) {
    logError(pathAPI, Date.now() - startTime, error);

    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// PUT - Update configuration parameters
export async function PUT(request: NextRequest) {
  const pathAPI = "PUT /config/parameters";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const existingConfig = await ConfigService.getConfigValue(Object.keys(body));

    const updatedBody = await resolveFiles(existingConfig, body, "config");

    await ConfigService.updateConfigValues(updatedBody);

    logResponse(pathAPI, Date.now() - startTime, { message: "Parameter has been updated successfully", data: body });

    return NextResponse.json({ success: true, message: "Parameter has been updated successfully" }, { status: 200 });
  } catch (error) {
    logError(pathAPI, Date.now() - startTime, error);

    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
