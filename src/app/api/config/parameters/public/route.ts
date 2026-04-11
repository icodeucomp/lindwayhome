import { NextRequest, NextResponse } from "next/server";

import { ConfigService } from "@/services";
import { logError, logger } from "@/lib";

// GET - Fetch specific configuration parameters by keys
export async function GET(request: NextRequest) {
  const pathAPI = "GET /config/parameters";
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const keyParams = searchParams.getAll("keyParams");

    if (keyParams.length === 0) {
      logger.error(`${pathAPI} error`, { error: "No keys provided" });
      return NextResponse.json({ success: false, message: "No keys provided" }, { status: 400 });
    }

    const configParameters = await ConfigService.getConfigValue(keyParams);
    return NextResponse.json({ success: true, data: configParameters }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
