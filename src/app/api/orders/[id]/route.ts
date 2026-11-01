import { NextRequest, NextResponse } from "next/server";

import { checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, orderInclude, prisma } from "@/lib";

import { confirmOrderPayment, releaseOrderPayment } from "@/services";

import { z } from "zod";

import { UpdateOrderSchema } from "@/types";

// GET - Fetch one order with its lines
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /orders/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });

    if (!order) {
      logger.error(`${pathAPI} error`, { error: "Order not found" });
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// PUT - Update an order. Flipping isPurchased to true confirms payment through the
// same `confirmOrderPayment` path a Xendit callback uses (§B6.3, D23) — this is now
// an explicit manual override for when a gateway confirmation is lost or bypassed,
// not the primary way payment gets confirmed. Stock itself is untouched here: it was
// already reserved at checkout (`POST /orders/checkout`), so confirming payment only
// credits `soldCount`.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /orders/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const updateData = UpdateOrderSchema.parse(body);

    const existingOrder = await prisma.order.findUnique({ where: { id }, select: { id: true, isPurchased: true, cancelledAt: true } });
    if (!existingOrder) {
      logger.error(`${pathAPI} error`, { error: "Order not found" });
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    if (updateData.isPurchased === true && !existingOrder.isPurchased) {
      await confirmOrderPayment(id, { source: "ADMIN" });
    }

    // Everything else an admin can legitimately edit — a fixed allowlist rather than
    // spreading the whole parsed body, so a stray field (e.g. `paymentMethod`, which
    // only `confirmOrderPayment`/the webhook may set) can never slip through.
    const { status, trackingNumber, fullname, whatsappNumber, address, postalCode, instagram, reference } = updateData;
    const fieldEdits = { status, trackingNumber, fullname, whatsappNumber, address, postalCode, instagram, reference };
    const hasFieldEdits = Object.values(fieldEdits).some((value) => value !== undefined);

    const order = hasFieldEdits
      ? await prisma.order.update({
          where: { id },
          data: { ...fieldEdits, ...(status === "CANCELLED" && !existingOrder.cancelledAt ? { cancelledAt: new Date() } : {}), updatedAt: new Date() },
          include: orderInclude,
        })
      : await prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude });

    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const message = `Order updated successfully. ${totalItems} item(s).`;

    logResponse(pathAPI, Date.now() - startTime, { message });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// DELETE - closes gap A9.6: the client already called this endpoint, which did not exist.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /orders/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const order = await prisma.order.findUnique({ where: { id }, select: { id: true, isPurchased: true } });

    if (!order) {
      logger.error(`${pathAPI} error`, { error: "Order not found" });
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // A verified order has already moved stock and soldCount. Deleting it would
    // leave both wrong with no trace, so it can only be cancelled.
    if (order.isPurchased) {
      logger.error(`${pathAPI} error`, { error: "Cannot delete a verified order" });
      return NextResponse.json({ success: false, message: "This order has already been verified and moved stock. Cancel it instead of deleting it." }, { status: 400 });
    }

    // An unpurchased order still holds the stock reserved for it at checkout — a
    // no-op if a webhook already released it (payment expired/denied) before the
    // admin got here.
    await releaseOrderPayment(id, "Order deleted by admin");

    await prisma.order.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Order deleted successfully" });

    return NextResponse.json({ success: true, message: "Order deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
