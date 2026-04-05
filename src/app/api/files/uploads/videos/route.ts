import { NextRequest, NextResponse } from "next/server";

import { FileUploader, logger } from "@/lib";

const uploader = new FileUploader({
  allowedTypes: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv"],
  maxFileSize: 15 * 1024 * 1024,
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
  const start = Date.now();

  logger.info("API Request /files/uploads/videos", {
    method: request.method,
    url: request.url,
    pathname: request.nextUrl.pathname,
    ip,
  });

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      logger.error("API /files/uploads/videos error", { error: "No files provided" });
      return NextResponse.json({ success: false, message: "No files provided" }, { status: 400 });
    }

    // Upload to temp first — final move happens on form submit via /files/finalize
    const uploadResults = await Promise.all(files.map((file) => uploader.uploadToTemp(file)));

    logger.info("API Response /files/uploads/videos", {
      message: "Videos uploaded to temp successfully",
      durationMs: Date.now() - start,
      count: uploadResults.length,
      data: uploadResults,
    });

    return NextResponse.json({
      success: true,
      message: "Videos uploaded to temp successfully",
      data: uploadResults,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error("API /files/uploads/videos error", { error: errorMessage, stack: errorStack, durationMs: Date.now() - start });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
