import { NextRequest, NextResponse } from "next/server";

import { FileUploader, logger } from "@/lib";

const uploader = new FileUploader({
  baseUploadPath: "public/uploads",
  allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  maxFileSize: 5 * 1024 * 1024,
});

// POST - Uploads images
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const files = formData.getAll("files") as File[];
    const subPath = (formData.get("subPath") as string) || "products";

    if (!files || files.length === 0) {
      logger.error("API /files/uploads/images error", { error: "No files provided" });
      return NextResponse.json({ success: false, message: "No files provided" }, { status: 400 });
    }

    const uploadResults = await uploader.uploadMultipleFiles(files, subPath);

    logger.info("API Response /files/uploads/images", {
      message: "File image uploaded successfully",
      data: uploadResults,
    });

    return NextResponse.json({
      success: true,
      message: "File image uploaded successfully",
      data: uploadResults,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /files/uploads/images error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
