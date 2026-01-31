import { NextRequest, NextResponse } from "next/server";

import { authenticate, authorize, logger } from "@/lib";

import { ConfigService } from "@/services";

export async function GET(request: NextRequest) {
  const authenticationResult = await authenticate(request);
  const authorizationResult = await authorize(request, "ADMIN");
  if (authenticationResult.message) {
    logger.error("API /config/parameters error", { error: authenticationResult.message });
    return NextResponse.json({ success: false, message: authenticationResult.message }, { status: authenticationResult.status });
  }
  if (authorizationResult.message) {
    logger.error("API /config/parameters error", { error: authorizationResult.message });
    return NextResponse.json({ success: false, message: authorizationResult.message }, { status: authorizationResult.status });
  }

  try {
    const configParameters = await ConfigService.getAllConfigurations();
    return NextResponse.json({ success: true, data: configParameters }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /config/parameters error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authenticationResult = await authenticate(request);
  const authorizationResult = await authorize(request, "ADMIN");
  if (authenticationResult.message) {
    logger.error("API /config/parameters error", { error: authenticationResult.message });
    return NextResponse.json({ success: false, message: authenticationResult.message }, { status: authenticationResult.status });
  }
  if (authorizationResult.message) {
    logger.error("API /config/parameters error", { error: authorizationResult.message });
    return NextResponse.json({ success: false, message: authorizationResult.message }, { status: authorizationResult.status });
  }

  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /config/parameters", {
      method: request.method,
      body: body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    await ConfigService.updateConfigValues(body);

    logger.info("API Response /config/parameters", {
      message: "Parameter has been updated successfully",
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ success: true, message: "Parameter has been updated successfully" }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /config/parameters error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
