import { NextRequest, NextResponse } from "next/server";

import { prisma, logger } from "@/lib";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();

    logger.info("API Request /guests/membership/[id]", {
      method: request.method,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    const guest = await prisma.guest.findUnique({ where: { id } });

    if (!guest) {
      return NextResponse.json({ success: false, message: "Guest not found" }, { status: 404 });
    }

    await prisma.guest.update({
      where: { id },
      data: { isMember: true, updatedAt: new Date() },
    });

    logger.info("API Response /guests/membership/[id]", {
      message: "Guest membership updated successfully.",
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ success: true, message: "Guest membership updated successfully." }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /guests/membership/[id] error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
