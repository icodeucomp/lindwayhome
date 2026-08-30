import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { PaxelError, cancelShipment } from "@/services";

import { checkAuth, errorMessage, getClientIp, logError, logRequest, logResponse, prisma } from "@/lib";

import { CancelShipmentSchema } from "@/types";

import { PAXEL_UNCANCELLABLE_STATUSES } from "@/types/paxel";

/**
 * POST /shipments/:airwaybill/cancel — Cancel a Shipment.
 *
 * Only possible before the courier collects the parcel; Paxel answers 410 Gone
 * afterwards. We check our own last-known status first so the common case gives a
 * useful sentence immediately, but the check is advisory — Paxel's answer is the
 * one that counts, and a stale local status must not block a cancellation that
 * would actually succeed.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ airwaybill: string }> }) {
  const { airwaybill } = await params;
  const pathAPI = `POST /shipments/${airwaybill}/cancel`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const { cancellationReason } = CancelShipmentSchema.parse(body);

    const existing = await prisma.shipment.findUnique({ where: { airwaybillCode: airwaybill }, select: { id: true, status: true, latestStatus: true, orderId: true } });

    if (!existing) {
      return NextResponse.json({ success: false, message: "No shipment recorded for that airwaybill." }, { status: 404 });
    }

    if (existing.status === "CANCELLED") {
      return NextResponse.json({ success: false, message: "This shipment is already cancelled." }, { status: 400 });
    }

    if (existing.latestStatus && PAXEL_UNCANCELLABLE_STATUSES.includes(existing.latestStatus.toUpperCase())) {
      return NextResponse.json({ success: false, message: "The courier has already collected this parcel, so it can no longer be cancelled." }, { status: 400 });
    }

    const shipment = await cancelShipment(airwaybill, cancellationReason);

    // The order goes back to PAID, not CANCELLED. The buyer has paid and the stock
    // has moved — only the courier booking was undone, and the order still needs a
    // new pickup rather than being written off.
    await prisma.order.updateMany({ where: { id: existing.orderId, status: "SHIPPED" }, data: { status: "PAID", trackingNumber: null } });

    const message = `Shipment ${airwaybill} cancelled.`;
    logResponse(pathAPI, Date.now() - startTime, { message });

    return NextResponse.json({ success: true, message, data: { ...shipment, shippingCost: shipment.shippingCost.toNumber() } }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    if (error instanceof PaxelError) {
      logError(`${pathAPI} paxel error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error.userMessage }, { status: 502 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
