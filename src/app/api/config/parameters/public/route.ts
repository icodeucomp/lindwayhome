import { NextRequest, NextResponse } from "next/server";

import { ConfigService } from "@/services";
import { logger } from "@/lib";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyParams = searchParams.getAll("keyParams");

    if (keyParams.length === 0) {
      return NextResponse.json({ success: false, message: "No keys provided" }, { status: 400 });
    }

    const configParameters = await ConfigService.getConfigValue(keyParams);
    return NextResponse.json({ success: true, data: configParameters }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /register error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
