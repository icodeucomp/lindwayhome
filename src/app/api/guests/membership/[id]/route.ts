import { NextRequest, NextResponse } from "next/server";

import { prisma, logger, getClientIp, logRequest, logResponse, logError } from "@/lib";

// PATCH - Update guest membership status
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PATCH /guests/membership/${id}`;
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    logRequest(pathAPI, request, id, ip);

    const guest = await prisma.guest.findUnique({ where: { id } });

    if (!guest) {
      logger.error(`${pathAPI} error`, { error: "Guest not found" });
      return NextResponse.json({ success: false, message: "Guest not found" }, { status: 404 });
    }

    await prisma.guest.update({ where: { id }, data: { isMember: true, updatedAt: new Date() } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Guest membership updated successfully." });

    return NextResponse.json({ success: true, message: "Guest membership updated successfully." }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
