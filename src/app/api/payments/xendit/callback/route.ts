import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "prisma-client/client";

import { errorMessage, getClientIp, logError, logRequest, logResponse, logger, prisma } from "@/lib";

import { confirmOrderPayment, mapXenditStatus, releaseOrderPayment, verifyCallbackToken } from "@/services";

import { XenditCallbackPayload } from "@/types/xendit";

/**
 * POST — Xendit's Invoice payment callback.
 *
 * Public (no `checkAuth`; Xendit calls this directly), gated by the `x-callback-token`
 * header instead of `checkAuth` — the same "public but gated" shape as
 * `api/files/cleanup` (`x-cron-secret`), just with a token Xendit's own dashboard
 * issues rather than one we mint ourselves.
 *
 * Xendit retries a callback delivery on anything but a 2xx, so every transition this
 * handler makes has to be safe to receive twice — `confirmOrderPayment` and
 * `releaseOrderPayment` both guard their write with a `WHERE` clause on the order's
 * current state for exactly that reason (see their doc comments in
 * `src/services/payment.ts`).
 */
export async function POST(request: NextRequest) {
  const pathAPI = "POST /payments/xendit/callback";
  const startTime = Date.now();

  try {
    const body = (await request.json()) as XenditCallbackPayload;

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    // Checked BEFORE anything else touches the database. A forged callback for a
    // real external_id must not get as far as a lookup.
    if (!verifyCallbackToken(request.headers.get("x-callback-token"))) {
      logger.error(`${pathAPI} error`, { error: "Callback token verification failed", gatewayOrderId: body.external_id });
      return NextResponse.json({ success: false, message: "Invalid callback token" }, { status: 401 });
    }

    const transaction = await prisma.paymentTransaction.findUnique({ where: { gatewayOrderId: body.external_id }, select: { id: true, orderId: true, grossAmount: true } });

    if (!transaction) {
      // Should never happen against a real transaction — logged loudly rather than
      // silently 200'd, since a real gap here means a payment nobody is tracking.
      logger.error(`${pathAPI} error`, { error: "No PaymentTransaction for this gatewayOrderId", gatewayOrderId: body.external_id });
      return NextResponse.json({ success: false, message: "Unknown order" }, { status: 404 });
    }

    // Defense in depth alongside the callback token: the two should always already agree.
    if (Number.isFinite(body.amount) && Math.abs(body.amount - transaction.grossAmount.toNumber()) > 1) {
      logger.error(`${pathAPI} error`, { error: "amount mismatch", gatewayOrderId: body.external_id, reported: body.amount, expected: transaction.grossAmount.toNumber() });
      return NextResponse.json({ success: false, message: "Amount mismatch" }, { status: 409 });
    }

    const coarseStatus = mapXenditStatus(body.status);

    // The raw payload is kept regardless of what it means — a payment dispute needs
    // to be explainable after the fact, the reason `OrderItem` snapshots its price.
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: coarseStatus,
        transactionId: body.id,
        paymentType: body.payment_channel ?? body.payment_method,
        rawNotification: body as unknown as Prisma.InputJsonValue,
        ...(coarseStatus === "SETTLED" ? { paidAt: new Date() } : {}),
        ...(coarseStatus === "EXPIRED" ? { expiredAt: new Date() } : {}),
      },
    });

    if (coarseStatus === "SETTLED") {
      await confirmOrderPayment(transaction.orderId, { source: "XENDIT", paymentType: body.payment_channel ?? body.payment_method });
    } else if (coarseStatus === "EXPIRED" || coarseStatus === "CANCELLED" || coarseStatus === "DENIED") {
      await releaseOrderPayment(transaction.orderId, `Xendit reported status=${body.status}`);
    }
    // PENDING and REFUNDED are recorded on the transaction row above and drive no
    // order transition — PENDING because nothing is known yet, REFUNDED because
    // refunding an already-settled, already-shipped order is a separate, unbuilt
    // concern (same boundary `releaseOrderPayment`'s own doc comment draws).

    logResponse(pathAPI, Date.now() - startTime, { message: "Callback processed", data: { gatewayOrderId: body.external_id, status: coarseStatus } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // A genuine failure surfaces as 500 on purpose — Xendit retries a non-2xx, and
    // every write above is safe to receive again.
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
