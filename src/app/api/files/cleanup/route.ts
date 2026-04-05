// app/api/files/cleanup/route.ts
import { NextRequest, NextResponse } from "next/server";

import { FileUploader } from "@/lib";

const uploader = new FileUploader();

export async function POST(request: NextRequest) {
  // Protect with a secret header so only your cron can call this
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const deleted = await uploader.cleanupTempFiles();
  return NextResponse.json({ success: true, deleted });
}
