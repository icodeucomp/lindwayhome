import { NextRequest, NextResponse } from "next/server";

import { logger, prisma } from "@/lib";

import { releaseOrderPayment } from "@/services";

/**
 * POST /orders/cleanup — sweeps orders stuck AWAITING_PAYMENT long after their
 * Xendit invoice should have expired.
 *
 * Xendit sends an "EXPIRED" callback automatically, which is the primary way a
 * stuck reservation gets released. This is the belt-and-suspenders backstop for
 * when that notification never arrives — mirrors `api/files/cleanup`'s shape
 * exactly: a secret header rather than `checkAuth`, since an external scheduler
 * calls this, not an admin session.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // A day past Xendit's own 24h invoice expiry — long enough that a genuine
  // pending payment has certainly resolved one way or the other by then.
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const stuck = await prisma.order.findMany({
    where: { status: "AWAITING_PAYMENT", createdAt: { lt: cutoff } },
    select: { id: true },
  });

  let released = 0;

  for (const order of stuck) {
    try {
      const result = await releaseOrderPayment(order.id, "Cleanup sweep: stuck AWAITING_PAYMENT past Xendit's own expiry window");
      if (result.applied) released += 1;
    } catch (error) {
      logger.error("orders/cleanup: failed to release order", { orderId: order.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json({ success: true, checked: stuck.length, released });
}
