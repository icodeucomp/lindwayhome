import { NextRequest, NextResponse } from "next/server";

import { FileUploader, logger } from "@/lib";

const uploader = new FileUploader();

// POST - Delete images
export async function POST(request: NextRequest) {
  try {
    const { subPath } = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /files/deletes", {
      method: request.method,
      body: subPath,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    if (!subPath) {
      logger.error("API /files/deletes error", { error: "subPath is required" });
      return NextResponse.json({ success: false, message: "subPath is required" }, { status: 400 });
    }

    if (typeof subPath !== "string") {
      logger.error("API /files/deletes error", { error: "subPath must be a string" });
      return NextResponse.json({ success: false, message: "subPath must be a string" }, { status: 400 });
    }

    if (subPath.trim() === "") {
      logger.error("API /files/deletes error", { error: "subPath cannot be empty" });
      return NextResponse.json({ success: false, message: "subPath cannot be empty" }, { status: 400 });
    }

    const uploadResults = await uploader.deleteFile(subPath.trim());

    logger.info("API Response /files/deletes", {
      message: "File deleted successfully",
      durationMs: Date.now() - start,
      data: uploadResults,
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
      data: uploadResults,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /files/deletes error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
