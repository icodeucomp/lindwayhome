import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ConfigService, ShippingService } from "@/services";

import { getClientIp, logCalculation, logError, logger, logRequest, logResponse, prisma, resolveFiles, sendOrderConfirmation } from "@/lib";

import { API_BASE_URL, calculateDistance, calculateShippingCost, calculateTotalPrice, hashItems, resolveUnitPrice, signCheckoutToken, toRupiah, verifyCheckoutToken, ShippingItem } from "@/utils";

import { CartSchema, CreateOrderSchema, DiscountType, ShippingCalculateSchema } from "@/types";

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

// GET - Calculate shipping & price, and issue the checkout token
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const province = searchParams.get("province");
  const district = searchParams.get("district");
  const sub_district = searchParams.get("sub_district");
  const village = searchParams.get("village");
  const email = searchParams.get("email");
  const itemsParam = searchParams.get("items");

  const pathAPI = `GET /orders/checkout/${email}`;

  const startTime = Date.now();

  try {
    logCalculation("Request received", {
      province,
      district,
      sub_district,
      village,
      email,
      itemsCount: itemsParam ? JSON.parse(itemsParam).length : 0,
    });

    // ── 1. Validate required params ──────────────────────────────────────────
    // `purchased` and `totalItemsSold` are deliberately NOT read from the query
    // string any more. v1 signed whatever subtotal the client claimed, so a buyer
    // could name their own total (A9.1). Both are derived below.
    if (!province || !district || !sub_district || !village || !itemsParam) {
      logger.error(`${pathAPI} error`, { error: "Missing required parameters" });
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 });
    }

    const validatedData = ShippingCalculateSchema.parse({
      province,
      district,
      sub_district,
      village,
      items: JSON.parse(itemsParam),
    });

    // ── 2. Parallel DB fetches ───────────────────────────────────────────────
    const [member, configParameters, config, zones] = await Promise.all([
      findActiveMember(email),
      ConfigService.getConfigValue(["tax_rate", "tax_type", "promotion_discount", "promo_type", "member_discount", "member_type"]),
      ShippingService.getShippingConfig(),
      ShippingService.getShippingZones(),
    ]);

    logCalculation("Email validation", { email, isMember: Boolean(member) });

    if (!config) {
      logger.error(`${pathAPI} error`, { error: "Shipping configuration not found" });
      return NextResponse.json({ success: false, message: "Shipping configuration not found" }, { status: 404 });
    }

    // ── 3. Destination coordinates ───────────────────────────────────────────
    const destinationCoords = await ShippingService.getDestinationCoordinates(validatedData.province, validatedData.district, validatedData.sub_district, validatedData.village);

    if (!destinationCoords) {
      logger.error(`${pathAPI} error`, { error: "Destination coordinates not found" });
      return NextResponse.json({ success: false, message: "Destination coordinates not found" }, { status: 404 });
    }

    // ── 4. Calculate distance ────────────────────────────────────────────────
    const distance_km = calculateDistance(config.origin_lat, config.origin_long, destinationCoords.lat, destinationCoords.long, config.earth_radius_km);

    // ── 5. Server-side subtotal + parcel dimensions (F-51) ───────────────────
    const itemsWithDimensions: ShippingItem[] = [];
    let purchased = 0;
    let totalItemsSold = 0;

    for (const item of validatedData.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, isActive: true, price: true, discountedPrice: true, translations: { where: { locale: "EN" }, select: { name: true } } },
      });

      if (!product || !product.isActive) {
        logger.error(`${pathAPI} error`, { error: `Product "${item.productId}" is not available` });
        return NextResponse.json({ success: false, message: `A product in your cart is no longer available.` }, { status: 404 });
      }

      const unitPrice = resolveUnitPrice(product);
      purchased += unitPrice * item.quantity;
      totalItemsSold += item.quantity;

      const dimensions = await ShippingService.getPackageDimensions(item.productId, item.selectedSize);

      if (!dimensions) {
        logger.error(`${pathAPI} error`, { error: `Dimensions for size "${item.selectedSize}" not found` });
        return NextResponse.json({ success: false, message: `Dimensions for size "${item.selectedSize}" not found in configuration.` }, { status: 404 });
      }

      logCalculation("Line priced", { productId: item.productId, name: product.translations[0]?.name, size: item.selectedSize, quantity: item.quantity, unitPrice });

      itemsWithDimensions.push({ ...dimensions, quantity: item.quantity });
    }

    logCalculation("Subtotal derived from database prices", { purchased, totalItemsSold });

    // ── 6. Calculate shipping ────────────────────────────────────────────────
    const calculation = calculateShippingCost(itemsWithDimensions, distance_km, config, zones);
    const shippingCost = toRupiah(calculation.shipping_final);

    // ── 7. Calculate total price ─────────────────────────────────────────────
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

    // ── 8. Sign checkout token (locks prices server-side for 15 min) ─────────
    const itemsHash = hashItems(validatedData.items.map((i) => ({ productId: i.productId, selectedSize: i.selectedSize, quantity: i.quantity })));

    const checkoutToken = signCheckoutToken({
      shippingCost,
      totalPurchased,
      purchased,
      totalItemsSold,
      itemsHash,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    logCalculation("Request completed", {
      pathAPI,
      processingTime: Date.now() - startTime,
      finalTotal: totalPurchased,
      zone: calculation.zone,
      distance_km: calculation.distance_km.toFixed(2),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          parameter: { ...configParameters },
          shipping: {
            cost: shippingCost,
            zone: calculation.zone,
            zone_label: calculation.zone_label,
            distance_km: parseFloat(calculation.distance_km.toFixed(2)),
            weight_kg: calculation.rounded_weight_kg,
            multiplier: calculation.multiplier,
            price_override: calculation.price_override,
          },
          purchased,
          totalItemsSold,
          totalPurchased,
          isMember: Boolean(member),
          checkoutToken,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
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

    let trustedPrices: { shippingCost: number; totalPurchased: number; purchased: number; totalItemsSold: number };

    try {
      const payload = verifyCheckoutToken(body.checkoutToken);

      const currentItemsHash = hashItems(items.map((i) => ({ productId: i.productId, selectedSize: i.selectedSize, quantity: i.quantity })));

      if (currentItemsHash !== payload.itemsHash) {
        logger.error(`${pathAPI} error`, { error: "Cart items changed since checkout was calculated. Please go back and recalculate." });
        return NextResponse.json({ success: false, message: "Cart items changed since checkout was calculated. Please go back and recalculate." }, { status: 400 });
      }

      trustedPrices = {
        shippingCost: payload.shippingCost,
        totalPurchased: payload.totalPurchased,
        purchased: payload.purchased,
        totalItemsSold: payload.totalItemsSold,
      };
    } catch (error) {
      logError(`${pathAPI} error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error }, { status: 500 });
    }

    // ── 3. Merge trusted prices, link the member, move the receipt out of temp ──
    const member = await findActiveMember(body.email ?? null);

    const createData = CreateOrderSchema.parse({
      ...body,
      shippingCost: trustedPrices.shippingCost,
      totalPurchased: trustedPrices.totalPurchased,
      purchased: trustedPrices.purchased,
      totalItemsSold: trustedPrices.totalItemsSold,
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
            translations: { where: { locale: "EN" }, select: { name: true } },
            variants: { where: { size: { code: item.selectedSize.toUpperCase() } }, select: { quantity: true } },
          },
        });

        if (!product) throw new Error(`Product with ID "${item.productId}" not found.`);

        const name = product.translations[0]?.name ?? product.id;

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

    // ── 5. Send confirmation email (non-fatal) ───────────────────────────────
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
      return NextResponse.json({ success: false, message: error }, { status: 500 });
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
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
