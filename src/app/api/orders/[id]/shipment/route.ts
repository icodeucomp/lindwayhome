import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { PaxelError, ShippingService, bookShipment, getShippingOrigin, parsePickupDatetime } from "@/services";

import { authenticate, checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { BookShipmentSchema } from "@/types";

import { PaxelServiceType } from "@/types/paxel";

/**
 * POST /orders/:id/shipment — book a Paxel pickup for a verified order.
 *
 * Booking is a deliberate second step rather than a side effect of verifying the
 * payment. Verification runs a transaction that decrements stock and increments
 * `soldCount`; folding a courier call into it would mean a Paxel timeout could roll
 * that back, or worse, leave it half-applied. Keeping them apart also means a failed
 * booking is simply retried, with the stock movement already safely recorded.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `POST /orders/${id}/shipment`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = BookShipmentSchema.parse(body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, sku: true, name: true } } } },
        shipments: { where: { status: { notIn: ["CANCELLED", "FAILED"] } }, select: { id: true, airwaybillCode: true } },
      },
    });

    if (!order) {
      logger.error(`${pathAPI} error`, { error: "Order not found" });
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // A courier collects goods that have been paid for. Booking before verification
    // would dispatch stock against a receipt nobody has looked at.
    if (!order.isPurchased) {
      return NextResponse.json({ success: false, message: "Verify the payment before booking a pickup." }, { status: 400 });
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json({ success: false, message: "This order is cancelled. Reinstate it before booking a pickup." }, { status: 400 });
    }

    // Re-booking is legitimate, but only after the previous booking is cancelled —
    // otherwise two couriers are sent for one parcel and we are billed for both.
    if (order.shipments.length > 0) {
      return NextResponse.json(
        { success: false, message: `This order already has an active shipment (${order.shipments[0].airwaybillCode}). Cancel it before booking another.` },
        { status: 409 },
      );
    }

    const origin = await getShippingOrigin();
    const pickupAt = parsePickupDatetime(data.pickupDate, data.pickupTime, origin.timeZone);

    // Paxel rejects a pickup that is in the past or too soon with a 400 whose body
    // is the sentence "Your delivery time cannot this value …". Checking here means
    // the admin gets a slot they can act on instead of that.
    const earliest = Date.now() + origin.pickupLeadMinutes * 60_000;

    if (pickupAt.getTime() < earliest) {
      const hours = origin.pickupLeadMinutes / 60;
      const lead = origin.pickupLeadMinutes % 60 === 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : `${origin.pickupLeadMinutes} minutes`;
      return NextResponse.json({ success: false, message: `The courier needs at least ${lead} notice. Choose a later pickup slot.` }, { status: 400 });
    }

    // Default to what the buyer paid for. An override is allowed — an admin may know
    // the courier better than the quote did — but it is never silent.
    const serviceType = (data.serviceType ?? order.shippingServiceType) as PaxelServiceType;

    // Resolve each line's parcel dimensions the same way the quote did (§B6.2), so
    // what Paxel is told matches what it priced.
    const lines = [];

    for (const item of order.items) {
      const dimensions = await ShippingService.getPackageDimensions(item.productId, item.selectedSize);

      if (!dimensions) {
        logger.error(`${pathAPI} error`, { error: `Dimensions missing for size "${item.selectedSize}"` });
        return NextResponse.json({ success: false, message: `No package dimensions are configured for size "${item.selectedSize}". Set them on the Parameters page and try again.` }, { status: 422 });
      }

      lines.push({
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        dimensions,
      });
    }

    const authResult = await authenticate(request);
    const adminId = "user" in authResult ? authResult.user?.id : undefined;

    const shipment = await bookShipment({
      orderId: order.id,
      invoiceNumber: order.id,
      serviceType,
      destination: {
        province: order.province,
        district: order.district,
        sub_district: order.sub_district,
        village: order.village,
        address: order.address,
        postalCode: order.postalCode,
        latitude: order.latitude.toNumber(),
        longitude: order.longitude.toNumber(),
        fullname: order.fullname,
        phone: order.whatsappNumber,
        email: order.email,
        note: order.addressNote ?? "",
      },
      lines,
      invoiceValue: order.totalPurchased.toNumber(),
      pickupAt,
      note: data.note,
      bookedById: adminId ?? null,
    });

    // The airwaybill is the tracking number the storefront already promises buyers,
    // so it lands on the order rather than only on the shipment row.
    await prisma.order.update({
      where: { id: order.id },
      data: { trackingNumber: shipment.airwaybillCode, ...(order.status === "PAID" ? { status: "SHIPPED" as const } : {}) },
    });

    const message = `Pickup booked. Airwaybill ${shipment.airwaybillCode}.`;
    logResponse(pathAPI, Date.now() - startTime, { message });

    return NextResponse.json({ success: true, message, data: { ...shipment, shippingCost: shipment.shippingCost.toNumber() } }, { status: 201 });
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
