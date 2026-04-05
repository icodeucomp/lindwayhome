import { NextRequest, NextResponse } from "next/server";

import { checkAuth, FileUploader, logger } from "@/lib";

import { ConfigService } from "@/services";

import { ConfigValue, EditConfigParameter, Files } from "@/types";

const uploader = new FileUploader();

// GET - Fetch all configuration parameters
export async function GET(request: NextRequest) {
  const authError = await checkAuth(request, "/config/parameters");
  if (authError) return authError;

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

// PUT - Update configuration parameters
export async function PUT(request: NextRequest) {
  const authError = await checkAuth(request, "/config/parameters");
  if (authError) return authError;

  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();

    logger.info("API Request /config/parameters", {
      method: request.method,
      body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    // Recursively find all Files objects that still have a tempId
    function extractTempFiles(value: ConfigValue, parentKey: string): { key: string; file: Files }[] {
      if (!value || typeof value !== "object") return [];

      if (Array.isArray(value)) {
        return value.flatMap((item) => extractTempFiles(item, parentKey));
      }

      // It's a Files object if it has a filename
      if ("filename" in value && typeof (value as Files).filename === "string") {
        return [{ key: parentKey, file: value as Files }];
      }

      // It's a JsonRow — recurse into its keys
      return Object.entries(value).flatMap(([k, v]) => extractTempFiles(v as ConfigValue, k));
    }

    const tempFiles = Object.entries(body as EditConfigParameter).flatMap(([key, value]) => extractTempFiles(value, key));

    // Move all temp files to "config" folder and update their paths in the body
    if (tempFiles.length > 0) {
      const destination = "config";

      const moved = await Promise.all(tempFiles.map(({ file }) => uploader.moveFromTemp(file.filename!, destination)));

      // Replace each temp file entry in-place with the finalized file info
      tempFiles.forEach(({ file }, index) => {
        const finalFile = moved[index];
        file.url = finalFile.url;
        file.path = finalFile.path;
      });
    }

    await ConfigService.updateConfigValues(body);

    logger.info("API Response /config/parameters", {
      message: "Parameter has been updated successfully",
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ success: true, message: "Parameter has been updated successfully" }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /config/parameters error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
