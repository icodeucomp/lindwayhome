import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "prisma-client/client";

import { checkAuth, errorMessage, logError, logResponse, orderInclude, prisma } from "@/lib";

import { XenditApi, XenditError, confirmOrderPayment, mapXenditStatus, releaseOrderPayment } from "@/services";

/**
 * GET /orders/:id/payment-status — asks Xendit directly instead of waiting for a
 * callback.
 *
 * Same shape as `GET /shipments/:airwaybill` for Paxel tracking: a pull-on-demand
 * refresh for when a push notification is suspected lost, safer than an admin's
 * blind manual override because it asks the gateway rather than taking someone's
 * word for it. Uses the exact same `confirmOrderPayment`/`releaseOrderPayment`
 * transitions the callback uses, so this can never apply a payment differently than
 * the callback would have.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /orders/${id}/payment-status`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const transaction = await prisma.paymentTransaction.findFirst({ where: { orderId: id }, orderBy: { createdAt: "desc" }, select: { id: true, transactionId: true } });

    if (!transaction || !transaction.transactionId) {
      return NextResponse.json({ success: false, message: "No Xendit invoice has been started for this order." }, { status: 404 });
    }

    // Xendit's Get Invoice endpoint is keyed by its OWN invoice id, not by our
    // `gatewayOrderId` (external_id) — unlike Midtrans, which used the same value
    // for both. `transactionId` is stamped the moment the invoice is created
    // (`POST /orders/checkout`), not only once a callback arrives, so it is present
    // here for any transaction that made it past initiation.
    const invoice = await XenditApi.getInvoice(transaction.transactionId);
    const coarseStatus = mapXenditStatus(invoice.status);

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: coarseStatus,
        paymentType: invoice.payment_channel ?? invoice.payment_method,
        rawNotification: invoice as unknown as Prisma.InputJsonValue,
        ...(coarseStatus === "SETTLED" ? { paidAt: new Date() } : {}),
        ...(coarseStatus === "EXPIRED" ? { expiredAt: new Date() } : {}),
      },
    });

    if (coarseStatus === "SETTLED") {
      await confirmOrderPayment(id, { source: "XENDIT", paymentType: invoice.payment_channel ?? invoice.payment_method });
    } else if (coarseStatus === "EXPIRED" || coarseStatus === "CANCELLED" || coarseStatus === "DENIED") {
      await releaseOrderPayment(id, `Manual status check reported status=${invoice.status}`);
    }

    const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude });

    logResponse(pathAPI, Date.now() - startTime, { message: `Xendit reports: ${invoice.status}` });

    return NextResponse.json({ success: true, message: `Xendit reports: ${invoice.status}`, data: order }, { status: 200 });
  } catch (error) {
    if (error instanceof XenditError) {
      logError(`${pathAPI} xendit error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error.userMessage }, { status: error.status >= 500 ? 502 : error.status });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
