import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ConfigService, PaxelError, ShippingService, ShippingDestination, getShippingOrigin, quoteServices } from "@/services";

import { errorMessage, getClientIp, logCalculation, logError, logger, logRequest, logResponse, prisma, resolveFiles, sendOrderConfirmation } from "@/lib";

import { API_BASE_URL, ParcelItem, calculateTotalPrice, consolidateParcel, hashDestination, hashItems, resolveUnitPrice, signCheckoutToken, toRupiah, verifyCheckoutToken } from "@/utils";

import { CartSchema, CreateOrderSchema, DiscountType, ShippingCalculateSchema } from "@/types";

import { PAXEL_SERVICE_TYPES, PaxelServiceType } from "@/types/paxel";

/**
 * Looks up the buyer's live membership. v1 asked "does any past order by this email
 * carry isMember?"; v2 asks the `Member` registry, so revoking a membership takes
 * effect without rewriting order history (D19).
 */
const findActiveMember = async (email: string | null) => {
  if (!email) return null;
  const member = await prisma.member.findUnique({ where: { email }, select: { id: true, isActive: true } });
  return member?.isActive ? member : null;
};

/**
 * Prices every line from the database and collects its parcel dimensions.
 *
 * Shared by GET and POST so the subtotal is computed once, in one place. Two
 * implementations would be two chances for the price shown and the price charged to
 * drift apart (F-49).
 */
type PricedCart = { ok: true; purchased: number; totalItemsSold: number; parcelItems: ParcelItem[] } | { ok: false; status: number; message: string; detail: string };

const priceCart = async (items: { productId: string; selectedSize: string; quantity: number }[]): Promise<PricedCart> => {
  const parcelItems: ParcelItem[] = [];
  let purchased = 0;
  let totalItemsSold = 0;

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { id: true, isActive: true, name: true, sku: true, price: true, discountedPrice: true },
    });

    if (!product || !product.isActive) {
      return { ok: false, status: 404, message: "A product in your cart is no longer available.", detail: `Product "${item.productId}" is not available` };
    }

    const unitPrice = resolveUnitPrice(product);
    purchased += unitPrice * item.quantity;
    totalItemsSold += item.quantity;

    const dimensions = await ShippingService.getPackageDimensions(item.productId, item.selectedSize);

    if (!dimensions) {
      return {
        ok: false,
        status: 404,
        message: `Dimensions for size "${item.selectedSize}" not found in configuration.`,
        detail: `Dimensions for size "${item.selectedSize}" not found`,
      };
    }

    logCalculation("Line priced", { productId: item.productId, name: product.name, size: item.selectedSize, quantity: item.quantity, unitPrice });

    parcelItems.push({ ...dimensions, quantity: item.quantity });
  }

  return { ok: true, purchased, totalItemsSold, parcelItems };
};

// GET - Quote every courier service, and issue a checkout token per service
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const province = searchParams.get("province");
  const district = searchParams.get("district");
  const sub_district = searchParams.get("sub_district");
  const village = searchParams.get("village");
  const email = searchParams.get("email");
  const itemsParam = searchParams.get("items");
  const address = searchParams.get("address");
  const postalCode = searchParams.get("postalCode");
  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");

  const pathAPI = `GET /orders/checkout/${email}`;

  const startTime = Date.now();

  try {
    logCalculation("Request received", { province, district, sub_district, village, email, itemsCount: itemsParam ? JSON.parse(itemsParam).length : 0 });

    // ── 1. Validate required params ──────────────────────────────────────────
    // `purchased` and `totalItemsSold` are deliberately NOT read from the query
    // string. v1 signed whatever subtotal the client claimed, so a buyer could name
    // their own total (A9.1). Both are derived below.
    if (!province || !district || !sub_district || !village || !itemsParam) {
      logger.error(`${pathAPI} error`, { error: "Missing required parameters" });
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 });
    }

    const validatedData = ShippingCalculateSchema.parse({
      province,
      district,
      sub_district,
      village,
      address: address ?? undefined,
      postalCode: postalCode ?? undefined,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      items: JSON.parse(itemsParam),
    });

    // ── 2. Parallel fetches ──────────────────────────────────────────────────
    const [member, configParameters, origin] = await Promise.all([
      findActiveMember(email),
      ConfigService.getConfigValue(["tax_rate", "tax_type", "promotion_discount", "promo_type", "member_discount", "member_type"]),
      getShippingOrigin(),
    ]);

    logCalculation("Email validation", { email, isMember: Boolean(member) });

    // ── 3. Destination coordinates ───────────────────────────────────────────
    // The buyer's own map pin wins. The village centroid is the fallback for a
    // buyer who never touched the map, and its absence means we do not recognise
    // the address at all.
    let coordinates = validatedData.latitude != null && validatedData.longitude != null ? { lat: validatedData.latitude, long: validatedData.longitude } : null;

    if (!coordinates) {
      coordinates = await ShippingService.getDestinationCoordinates(validatedData.province, validatedData.district, validatedData.sub_district, validatedData.village);
    }

    if (!coordinates) {
      logger.error(`${pathAPI} error`, { error: "Destination coordinates not found" });
      return NextResponse.json({ success: false, message: "We do not recognise that address yet. Please pick your village from the list again." }, { status: 404 });
    }

    // ── 4. Server-side subtotal + parcel dimensions (F-51) ───────────────────
    const priced = await priceCart(validatedData.items);

    if (!priced.ok) {
      logger.error(`${pathAPI} error`, { error: priced.detail });
      return NextResponse.json({ success: false, message: priced.message }, { status: priced.status });
    }

    const { purchased, totalItemsSold, parcelItems } = priced;

    logCalculation("Subtotal derived from database prices", { purchased, totalItemsSold });

    // ── 5. Pack the cart into one parcel ─────────────────────────────────────
    // Paxel prices a shipment, not a basket: one weight, one LxWxH. v1 summed a
    // volumetric cost per line, which has no equivalent here.
    const parcel = consolidateParcel(parcelItems);

    // ── 6. Quote every enabled service ───────────────────────────────────────
    const destination: ShippingDestination = {
      province: validatedData.province,
      district: validatedData.district,
      sub_district: validatedData.sub_district,
      village: validatedData.village,
      address: validatedData.address ?? `${validatedData.village}, ${validatedData.sub_district}`,
      postalCode: validatedData.postalCode ?? 0,
      latitude: coordinates.lat,
      longitude: coordinates.long,
    };

    const { quotes } = await quoteServices(destination, parcel, origin);

    const destinationHash = hashDestination({
      province: validatedData.province,
      district: validatedData.district,
      sub_district: validatedData.sub_district,
      village: validatedData.village,
      postalCode: validatedData.postalCode ?? 0,
    });

    const itemsHash = hashItems(validatedData.items.map((i) => ({ productId: i.productId, selectedSize: i.selectedSize, quantity: i.quantity })));

    const expiresAt = Date.now() + 15 * 60 * 1000;

    // ── 7. Price and sign each available service ─────────────────────────────
    // One token per service, so choosing a different one costs no round trip and
    // every option the buyer can click is already price-locked.
    const services = quotes.map((quote) => {
      if (!quote.available || quote.cost == null) {
        return { serviceType: quote.serviceType, available: false as const, reason: quote.reason ?? "Not available for this address." };
      }

      const shippingCost = quote.cost;

      const totalPurchased = toRupiah(
        calculateTotalPrice({
          basePrice: purchased,
          member: member ? (configParameters.member_discount as number) : 0,
          memberType: configParameters.member_type as DiscountType,
          promo: configParameters.promotion_discount as number,
          promoType: configParameters.promo_type as DiscountType,
          tax: configParameters.tax_rate as number,
          taxType: configParameters.tax_type as DiscountType,
          shipping: shippingCost,
        }),
      );

      return {
        serviceType: quote.serviceType,
        available: true as const,
        cost: shippingCost,
        totalPurchased,
        etaLabel: quote.etaLabel,
        pickupWindows: quote.pickupWindows,
        isMock: quote.isMock,
        checkoutToken: signCheckoutToken({ shippingCost, totalPurchased, purchased, totalItemsSold, itemsHash, serviceType: quote.serviceType, destinationHash, expiresAt }),
      };
    });

    const available = services.filter((service) => service.available);

    // Blocking rather than falling back to a distance formula is deliberate: one
    // price source means the price shown is the price charged and the price the
    // courier bills us. A quote we cannot book is worse than no quote.
    if (available.length === 0) {
      const reasons = services.map((service) => (service.available ? "" : service.reason)).filter(Boolean);
      logger.error(`${pathAPI} error`, { error: "No courier service available", reasons });

      return NextResponse.json(
        {
          success: false,
          message: reasons[0] ?? "We cannot ship to this address yet. Please contact us and we will arrange it for you.",
          data: { services, parcel },
        },
        { status: 422 },
      );
    }

    logCalculation("Request completed", { pathAPI, processingTime: Date.now() - startTime, parcel: parcel.dimension, available: available.length });

    return NextResponse.json(
      {
        success: true,
        data: {
          parameter: { ...configParameters },
          parcel,
          // The village centroid, so the checkout map has somewhere to open. It is
          // the starting pin, not the answer — the buyer drags it onto their door.
          destination: { latitude: coordinates.lat, longitude: coordinates.long },
          services,
          purchased,
          totalItemsSold,
          isMember: Boolean(member),
          expiresAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    // A courier outage is not our bug and must not read like one.
    if (error instanceof PaxelError) {
      logError(`${pathAPI} paxel error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error.userMessage }, { status: 502 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// POST - Create the order
export async function POST(request: NextRequest) {
  const pathAPI = `POST /orders/checkout`;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    // ── 1. Validate cart items ───────────────────────────────────────────────
    const { items } = CartSchema.parse(body);

    if (!items || items.length === 0) {
      logger.error(`${pathAPI} error`, { error: "Cart items are required" });
      return NextResponse.json({ success: false, message: "Cart items are required" }, { status: 400 });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.productId || !item.selectedSize || !item.quantity) {
        logger.error(`${pathAPI} error`, { error: `Item ${i + 1}: Missing required fields (productId, quantity, selectedSize).` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Missing required fields (productId, quantity, selectedSize).` }, { status: 400 });
      }
      if (item.quantity <= 0) {
        logger.error(`${pathAPI} error`, { error: `Item ${i + 1}: Quantity must be greater than 0.` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Quantity must be greater than 0.` }, { status: 400 });
      }
      if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity)) {
        logger.error(`${pathAPI} error`, { error: `Item ${i + 1}: Quantity must be a valid integer.` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Quantity must be a valid integer.` }, { status: 400 });
      }
    }

    // ── 2. Verify checkout token ─────────────────────────────────────────────
    if (!body.checkoutToken || typeof body.checkoutToken !== "string") {
      logger.error(`${pathAPI} error`, { error: "Checkout token is required. Please complete the order summary step first." });
      return NextResponse.json({ success: false, message: "Checkout token is required. Please complete the order summary step first." }, { status: 400 });
    }

    let trustedPrices: { shippingCost: number; totalPurchased: number; purchased: number; totalItemsSold: number; serviceType: PaxelServiceType };

    try {
      const payload = verifyCheckoutToken(body.checkoutToken);

      const currentItemsHash = hashItems(items.map((i) => ({ productId: i.productId, selectedSize: i.selectedSize, quantity: i.quantity })));

      if (currentItemsHash !== payload.itemsHash) {
        logger.error(`${pathAPI} error`, { error: "Cart items changed since checkout was calculated. Please go back and recalculate." });
        return NextResponse.json({ success: false, message: "Cart items changed since checkout was calculated. Please go back and recalculate." }, { status: 400 });
      }

      // The quote was priced for one destination and one service. Re-deriving both
      // hashes here is what stops a cheap quote being replayed against a far address
      // or against a dearer service.
      const currentDestinationHash = hashDestination({
        province: body.province,
        district: body.district,
        sub_district: body.sub_district,
        village: body.village,
        postalCode: body.postalCode,
      });

      if (currentDestinationHash !== payload.destinationHash) {
        logger.error(`${pathAPI} error`, { error: "Shipping address changed since checkout was calculated." });
        return NextResponse.json({ success: false, message: "Your shipping address changed since the price was calculated. Please go back and recalculate." }, { status: 400 });
      }

      if (!PAXEL_SERVICE_TYPES.includes(payload.serviceType as PaxelServiceType)) {
        logger.error(`${pathAPI} error`, { error: `Unknown service type in token: ${payload.serviceType}` });
        return NextResponse.json({ success: false, message: "That delivery service is no longer offered. Please recalculate your order." }, { status: 400 });
      }

      trustedPrices = {
        shippingCost: payload.shippingCost,
        totalPurchased: payload.totalPurchased,
        purchased: payload.purchased,
        totalItemsSold: payload.totalItemsSold,
        serviceType: payload.serviceType as PaxelServiceType,
      };
    } catch (error) {
      // An expired or forged token is a client-side condition, not a server fault.
      // v1 returned 500 here, which told a buyer whose 15 minutes had run out that
      // the site was broken.
      logError(`${pathAPI} token error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 400 });
    }

    // ── 3. Merge trusted prices, link the member, move the receipt out of temp ──
    const member = await findActiveMember(body.email ?? null);

    const createData = CreateOrderSchema.parse({
      ...body,
      shippingCost: trustedPrices.shippingCost,
      totalPurchased: trustedPrices.totalPurchased,
      purchased: trustedPrices.purchased,
      totalItemsSold: trustedPrices.totalItemsSold,
      shippingServiceType: trustedPrices.serviceType,
      isMember: Boolean(member),
    });

    // ── 4. Database transaction ──────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const lines: { productId: string; quantity: number; selectedSize: string; unitPrice: number; lineTotal: number; name: string }[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            isActive: true,
            price: true,
            discountedPrice: true,
            name: true,
            variants: { where: { size: { code: item.selectedSize.toUpperCase() } }, select: { quantity: true } },
          },
        });

        if (!product) throw new Error(`Product with ID "${item.productId}" not found.`);

        const name = product.name;

        if (!product.isActive) throw new Error(`Product "${name}" is not available for purchase.`);

        const variant = product.variants[0];
        if (!variant) throw new Error(`Selected size "${item.selectedSize}" is not available for product "${name}".`);

        if (variant.quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${name}" size "${item.selectedSize}". Available: ${variant.quantity}, Requested: ${item.quantity}`);
        }

        // Snapshot the price this line actually sold at. `discountedPrice` is
        // mutable, so without this an admin re-pricing the product later would
        // silently rewrite what past orders appear to have charged.
        const unitPrice = resolveUnitPrice(product);
        lines.push({ productId: item.productId, quantity: item.quantity, selectedSize: item.selectedSize, unitPrice, lineTotal: unitPrice * item.quantity, name });
      }

      const resolvedImages = await resolveFiles({}, createData.receiptImage, "receipts");

      const order = await tx.order.create({
        data: {
          ...createData,
          memberId: member?.id,
          receiptImage: resolvedImages,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              selectedSize: line.selectedSize,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
        },
      });

      return { order, lines };
    });

    // ── 5. Send confirmation email ───────────────────────────────────────────
    // The order is already committed at this point, so a failed email must not be
    // reported as a failed order — the buyer would re-submit and pay twice.
    try {
      await sendOrderConfirmation({
        orderId: result.order.id,
        email: result.order.email,
        address: result.order.address,
        whatsappNumber: result.order.whatsappNumber,
        postalCode: result.order.postalCode,
        totalPurchased: result.order.totalPurchased.toNumber(),
        shippingCost: result.order.shippingCost?.toNumber() ?? 0,
        totalItemsSold: result.order.totalItemsSold,
        isMember: result.order.isMember,
        paymentMethod: result.order.paymentMethod,
        fullname: result.order.fullname,
        items: result.lines.map((line) => ({
          product: { id: line.productId, name: line.name, price: line.unitPrice },
          selectedSize: line.selectedSize,
          quantity: line.quantity,
        })),
        baseUrl: API_BASE_URL!,
        createdAt: result.order.createdAt,
      });
    } catch (error) {
      logError("Send Order Confirmation failed with order ID: " + result.order.id, Date.now() - startTime, error);
    }

    // ── 6. Success response ──────────────────────────────────────────────────
    const totalItems = result.lines.reduce((sum, line) => sum + line.quantity, 0);

    logResponse(pathAPI, Date.now() - startTime, { message: `Order created with ${totalItems} item(s)`, data: body });

    return NextResponse.json({ success: true, message: `Order created successfully with ${totalItems} item${totalItems > 1 ? "s" : ""}.`, data: { id: result.order.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
