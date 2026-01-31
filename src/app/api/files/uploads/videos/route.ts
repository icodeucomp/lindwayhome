import { NextRequest, NextResponse } from "next/server";

import { FileUploader, logger } from "@/lib";

const uploader = new FileUploader({
  baseUploadPath: "public/uploads",
  allowedTypes: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv"],
  maxFileSize: 15 * 1024 * 1024,
});

// POST - Uploads videos
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      logger.error("API /files/uploads/videos error", { error: "No files provided" });
      return NextResponse.json({ success: false, message: "No files provided" }, { status: 400 });
    }

    const uploadResults = await uploader.uploadMultipleFiles(files, "videos");

    logger.info("API Response /files/uploads/videos", {
      message: "File video uploaded successfully",
      data: uploadResults,
    });

    return NextResponse.json({
      success: true,
      message: "File video uploaded successfully",
      data: uploadResults,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /files/uploads/videos error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
