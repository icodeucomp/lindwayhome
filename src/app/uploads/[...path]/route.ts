import { NextRequest, NextResponse } from "next/server";

import { readFile } from "fs/promises";
import { extname, join, resolve, sep } from "path";

// Uploads live outside Next's static pipeline (`UPLOADS_PATH`, not `public/`), so a
// production build has nothing that serves `/uploads/...` unless something does.
// This is that something — a deployment behind a reverse proxy may serve the folder
// itself and never reach this route.
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;

  const contentType = CONTENT_TYPES[extname(path[path.length - 1] ?? "").toLowerCase()];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  const base = resolve(process.env.UPLOADS_PATH || "uploads");
  const fullPath = resolve(join(base, ...path));
  if (!fullPath.startsWith(base + sep)) return new NextResponse("Not found", { status: 404 });

  try {
    const file = await readFile(fullPath);
    // Files are renamed on every upload, so a path never changes content.
    return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
