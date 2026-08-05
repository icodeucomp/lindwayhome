import { NextRequest, NextResponse } from "next/server";

import { checkAuth, getClientIp, logError, logger, logRequest, logResponse, orderInclude, prisma } from "@/lib";

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
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// PUT - Update an order. Flipping isPurchased to true decrements stock and
// increments soldCount, in one transaction (§A5.3, D23).
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

    const result = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id },
        include: { items: { include: { product: { select: { id: true, isActive: true, translations: { where: { locale: "EN" }, select: { name: true } } } } } } },
      });

      if (!existingOrder) throw new Error("Order not found");

      if (updateData.isPurchased === true && !existingOrder.isPurchased) {
        for (const item of existingOrder.items) {
          const name = item.product.translations[0]?.name ?? item.productId;

          if (!item.product.isActive) throw new Error(`Product "${name}" is no longer available for purchase.`);

          const variant = await tx.productVariant.findFirst({
            where: { productId: item.productId, size: { code: item.selectedSize.toUpperCase() } },
            select: { id: true, quantity: true },
          });

          if (!variant) throw new Error(`Selected size "${item.selectedSize}" is no longer available for product "${name}".`);

          if (variant.quantity < item.quantity) {
            throw new Error(`Insufficient stock for product "${name}" in size "${item.selectedSize}". Only ${variant.quantity} items available, but ${item.quantity} requested.`);
          }

          // Only the variant is written. products.stock follows via the
          // product_variant_stock_sync trigger — application code must never set it (D24).
          await tx.productVariant.update({ where: { id: variant.id }, data: { quantity: { decrement: item.quantity } } });
          await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.quantity } } });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          ...updateData,
          // Keep the lifecycle and the stock flag consistent without forcing the
          // admin to set both: verifying payment means PAID, unless a later state
          // was chosen explicitly.
          ...(updateData.isPurchased === true && !updateData.status && existingOrder.status === "AWAITING_PAYMENT" ? { status: "PAID" as const } : {}),
          ...(updateData.status === "CANCELLED" && !existingOrder.cancelledAt ? { cancelledAt: new Date() } : {}),
          updatedAt: new Date(),
        },
        include: orderInclude,
      });
    });

    const totalItems = result.items.reduce((sum, item) => sum + item.quantity, 0);
    const message = `Order updated successfully. ${totalItems} item(s).`;

    logResponse(pathAPI, Date.now() - startTime, { message });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
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

    await prisma.order.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Order deleted successfully" });

    return NextResponse.json({ success: true, message: "Order deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
