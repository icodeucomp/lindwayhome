import { NextRequest, NextResponse } from "next/server";

import { FileUploader, getClientIp, logError, logger, logRequest, logResponse } from "@/lib";

const uploader = new FileUploader();

// POST - Delete images
export async function POST(request: NextRequest) {
  const { subPath } = await request.json();
  const pathAPI = `POST /files/deletes/${subPath}`;
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    logRequest(pathAPI, request, subPath, ip);

    if (!subPath) {
      logger.error(`${pathAPI} error`, { error: "subPath is required" });
      return NextResponse.json({ success: false, message: "subPath is required" }, { status: 400 });
    }

    if (typeof subPath !== "string") {
      logger.error(`${pathAPI} error`, { error: "subPath must be a string" });
      return NextResponse.json({ success: false, message: "subPath must be a string" }, { status: 400 });
    }

    if (subPath.trim() === "") {
      logger.error(`${pathAPI} error`, { error: "subPath cannot be empty" });
      return NextResponse.json({ success: false, message: "subPath cannot be empty" }, { status: 400 });
    }

    const uploadResults = await uploader.deleteFile(subPath.trim());

    if (!uploadResults) {
      logger.error(`${pathAPI} error`, { error: "File not found or already deleted" });
      return NextResponse.json({ success: false, message: "File not found or already deleted" }, { status: 404 });
    }

    logResponse(pathAPI, Date.now() - startTime, { message: "File deleted successfully", data: uploadResults });

    return NextResponse.json({ success: true, message: "File deleted successfully", data: uploadResults });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
