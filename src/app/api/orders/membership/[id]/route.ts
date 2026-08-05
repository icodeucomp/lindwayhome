import { NextRequest, NextResponse } from "next/server";

import { prisma, logger, getClientIp, logRequest, logResponse, logError } from "@/lib";

// PATCH - Activate membership from the post-order page (F-15, §B6.4)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PATCH /orders/membership/${id}`;
  const startTime = Date.now();

  try {
    const ip = getClientIp(request);
    logRequest(pathAPI, request, id, ip);

    const order = await prisma.order.findUnique({ where: { id }, select: { id: true, email: true, fullname: true, memberId: true } });

    if (!order) {
      logger.error(`${pathAPI} error`, { error: "Order not found" });
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // Two writes with distinct meanings (D19): `Member` is the revocable current
    // state, `Order.isMember` is the frozen record that this order was priced as a
    // member. Re-activating an account that was revoked flips isActive back.
    const member = await prisma.$transaction(async (tx) => {
      const upserted = await tx.member.upsert({
        where: { email: order.email },
        update: { isActive: true, fullname: order.fullname },
        create: { email: order.email, fullname: order.fullname },
      });

      await tx.order.update({ where: { id }, data: { isMember: true, memberId: upserted.id, updatedAt: new Date() } });

      return upserted;
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Membership activated successfully.", memberId: member.id });

    return NextResponse.json({ success: true, message: "Membership activated successfully." }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
