import { NextRequest, NextResponse } from "next/server";

import { FileUploader, getClientIp, logError, logger, logRequest, logResponse } from "@/lib";

const uploader = new FileUploader({
  allowedTypes: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv"],
  maxFileSize: 15 * 1024 * 1024,
});

export async function POST(request: NextRequest) {
  const pathAPI = "POST /files/uploads/videos";
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    const ip = getClientIp(request);
    logRequest(pathAPI, request, files, ip);

    if (!files || files.length === 0) {
      logger.error(`${pathAPI} error`, { error: "No files provided" });
      return NextResponse.json({ success: false, message: "No files provided" }, { status: 400 });
    }

    const uploadResults = await Promise.all(files.map((file) => uploader.uploadToTemp(file)));

    logResponse(pathAPI, Date.now() - startTime, { message: "Videos uploaded to temp successfully", data: uploadResults });

    return NextResponse.json({ success: true, message: "Videos uploaded to temp successfully", data: uploadResults });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
