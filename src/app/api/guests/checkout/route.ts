import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ConfigService, ShippingService } from "@/services";

import { logCalculation, logger, prisma, sendOrderConfirmation } from "@/lib";

import { API_BASE_URL, calculateDistance, calculateShippingCost, calculateTotalPrice, signCheckoutToken, verifyCheckoutToken, hashItems, ShippingItem } from "@/utils";

import { CartSchema, CreateGuestSchema, DiscountType, ShippingCalculateSchema } from "@/types";

// ===========================
// GET - Calculate Shipping & Price
// ===========================
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province");
    const district = searchParams.get("district");
    const sub_district = searchParams.get("sub_district");
    const village = searchParams.get("village");
    const email = searchParams.get("email");
    const itemsParam = searchParams.get("items");
    const purchasedParam = searchParams.get("purchased");
    const totalItemsSoldParam = searchParams.get("totalItemsSold");

    logCalculation("Request received", {
      province,
      district,
      sub_district,
      village,
      email,
      purchasedParam,
      totalItemsSoldParam,
      itemsCount: itemsParam ? JSON.parse(itemsParam).length : 0,
    });

    // ── 1. Validate required params ──────────────────────────────────────────
    if (!province || !district || !sub_district || !village || !itemsParam || !purchasedParam || !totalItemsSoldParam) {
      logger.error("GET /guests/checkout", { error: "Missing required parameters" });
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 });
    }

    const validatedData = ShippingCalculateSchema.parse({
      province,
      district,
      sub_district,
      village,
      purchased: parseFloat(purchasedParam),
      totalItemsSold: parseInt(totalItemsSoldParam),
      items: JSON.parse(itemsParam),
    });

    // ── 2. Parallel DB fetches ───────────────────────────────────────────────
    const [isValidateEmail, configParameters, config, zones] = await Promise.all([
      prisma.guest.findFirst({
        where: { email: email || undefined, isMember: true },
        select: { isMember: true },
      }),
      ConfigService.getConfigValue(["tax_rate", "tax_type", "promotion_discount", "promo_type", "member_discount", "member_type"]),
      ShippingService.getShippingConfig(),
      ShippingService.getShippingZones(),
    ]);

    logCalculation("Email validation", {
      email,
      isMember: isValidateEmail?.isMember ?? false,
    });

    if (!config) {
      logger.error("GET /guests/checkout", { error: "Shipping configuration not found" });
      return NextResponse.json({ success: false, message: "Shipping configuration not found" }, { status: 404 });
    }

    // ── 3. Destination coordinates ───────────────────────────────────────────
    const destinationCoords = await ShippingService.getDestinationCoordinates(validatedData.province, validatedData.district, validatedData.sub_district, validatedData.village);

    if (!destinationCoords) {
      logger.error("GET /guests/checkout", { error: "Destination coordinates not found" });
      return NextResponse.json({ success: false, message: "Destination coordinates not found" }, { status: 404 });
    }

    // ── 4. Calculate distance ────────────────────────────────────────────────
    const distance_km = calculateDistance(config.origin_lat, config.origin_long, destinationCoords.lat, destinationCoords.long, config.earth_radius_km);

    // ── 5. Resolve item dimensions ───────────────────────────────────────────
    const itemsWithDimensions: ShippingItem[] = [];

    for (const item of validatedData.items) {
      const dimensions = await ShippingService.getProductDimensionsBySize(item.selectedSize);

      if (!dimensions) {
        logger.error("GET /guests/checkout", {
          error: `Dimensions for size "${item.selectedSize}" not found`,
        });
        return NextResponse.json(
          {
            success: false,
            message: `Dimensions for size "${item.selectedSize}" not found in configuration.`,
          },
          { status: 404 },
        );
      }

      itemsWithDimensions.push({
        weight_g: dimensions.weight_g,
        length_cm: dimensions.length_cm,
        width_cm: dimensions.width_cm,
        height_cm: dimensions.height_cm,
        quantity: item.quantity,
      });
    }

    // ── 6. Calculate shipping ────────────────────────────────────────────────
    const calculation = calculateShippingCost(itemsWithDimensions, distance_km, config, zones);

    // ── 7. Calculate total price ─────────────────────────────────────────────
    const totalPurchased = calculateTotalPrice({
      basePrice: validatedData.purchased,
      member: isValidateEmail?.isMember ? (configParameters.member_discount as number) : 0,
      memberType: configParameters.member_type as DiscountType,
      promo: configParameters.promotion_discount as number,
      promoType: configParameters.promo_type as DiscountType,
      tax: configParameters.tax_rate as number,
      taxType: configParameters.tax_type as DiscountType,
      shipping: calculation.shipping_final,
    });

    // ── 8. Sign checkout token (locks prices server-side for 15 min) ─────────
    const itemsHash = hashItems(
      validatedData.items.map((i) => ({
        productId: i.productId,
        selectedSize: i.selectedSize,
        quantity: i.quantity,
      })),
    );

    const checkoutToken = signCheckoutToken({
      shippingCost: calculation.shipping_final,
      totalPurchased,
      purchased: validatedData.purchased,
      totalItemsSold: validatedData.totalItemsSold,
      itemsHash,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    logCalculation("Request completed", {
      processingTime: `${Date.now() - startTime}ms`,
      finalTotal: totalPurchased,
      email,
      zone: calculation.zone,
      distance_km: calculation.distance_km.toFixed(2),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          parameter: { ...configParameters },
          shipping: {
            cost: calculation.shipping_final,
            zone: calculation.zone,
            zone_label: calculation.zone_label,
            distance_km: parseFloat(calculation.distance_km.toFixed(2)),
            weight_kg: calculation.rounded_weight_kg,
            multiplier: calculation.multiplier,
            price_override: calculation.price_override,
          },
          purchased: validatedData.purchased,
          totalItemsSold: validatedData.totalItemsSold,
          totalPurchased,
          isMember: isValidateEmail?.isMember ?? false,
          checkoutToken,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.error("GET /guests/checkout zod error", { error: error.message, processingTime });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    logger.error("GET /guests/checkout error", { error: errorMessage, processingTime });
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

// ===========================
// POST - Create Guest Order
// ===========================
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";

    logger.info("POST Request /guests/checkout", { url: request.url, ip, ...body });

    // ── 1. Validate cart items ───────────────────────────────────────────────
    const { items } = CartSchema.parse(body);

    if (!items || items.length === 0) {
      logger.error("API /guests/[id] error", { error: "Cart items are required" });
      return NextResponse.json({ success: false, message: "Cart items are required" }, { status: 400 });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.productId || !item.selectedSize || !item.quantity) {
        logger.error("API /guests/[id] error", { error: `Item ${i + 1}: Missing required fields (productId, quantity, selectedSize).` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Missing required fields (productId, quantity, selectedSize).` }, { status: 400 });
      }
      if (item.quantity <= 0) {
        logger.error("API /guests/[id] error", { error: `Item ${i + 1}: Quantity must be greater than 0.` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Quantity must be greater than 0.` }, { status: 400 });
      }
      if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity)) {
        logger.error("API /guests/[id] error", { error: `Item ${i + 1}: Quantity must be a valid integer.` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Quantity must be a valid integer.` }, { status: 400 });
      }
    }

    // ── 2. Verify checkout token ─────────────────────────────────────────────
    if (!body.checkoutToken || typeof body.checkoutToken !== "string") {
      logger.error("API /guests/checkout error", { error: "Checkout token is required. Please complete the order summary step first." });
      return NextResponse.json({ success: false, message: "Checkout token is required. Please complete the order summary step first." }, { status: 400 });
    }

    let trustedPrices: { shippingCost: number; totalPurchased: number; purchased: number; totalItemsSold: number };

    try {
      const payload = verifyCheckoutToken(body.checkoutToken);

      const currentItemsHash = hashItems(
        items.map((i) => ({
          productId: i.productId,
          selectedSize: i.selectedSize,
          quantity: i.quantity,
        })),
      );

      if (currentItemsHash !== payload.itemsHash) {
        logger.error("API /guests/checkout error", { error: "Cart items changed since checkout was calculated. Please go back and recalculate." });
        return NextResponse.json({ success: false, message: "Cart items changed since checkout was calculated. Please go back and recalculate." }, { status: 400 });
      }

      trustedPrices = {
        shippingCost: payload.shippingCost,
        totalPurchased: payload.totalPurchased,
        purchased: payload.purchased,
        totalItemsSold: payload.totalItemsSold,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid checkout session";
      logger.error("API /guests/checkout error", { error: msg });
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    // ── 3. Merge trusted prices into guest data ──────────────────────────────
    const createData = CreateGuestSchema.parse({
      ...body,
      shippingCost: trustedPrices.shippingCost,
      totalPurchased: trustedPrices.totalPurchased,
      purchased: trustedPrices.purchased,
      totalItemsSold: trustedPrices.totalItemsSold,
    });

    // ── 4. Database transaction ──────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, isActive: true, sizes: true },
        });

        if (!product) {
          throw new Error(`Product with ID "${item.productId}" not found.`);
        }
        if (!product.isActive) {
          throw new Error(`Product "${product.name}" is not available for purchase.`);
        }
        if (!product.sizes || !Array.isArray(product.sizes)) {
          throw new Error(`Size information is not available for product "${product.name}".`);
        }

        const sizes = product.sizes as Array<{ size: string; quantity: number }>;
        const sizeData = sizes.find((s) => s.size === item.selectedSize);

        if (!sizeData) {
          throw new Error(`Selected size "${item.selectedSize}" is not available for product "${product.name}".`);
        }
        if (sizeData.quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}" size "${item.selectedSize}". ` + `Available: ${sizeData.quantity}, Requested: ${item.quantity}`);
        }
      }

      const guest = await tx.guest.create({ data: createData });

      const cartItems = await Promise.all(
        items.map((item) =>
          tx.cart.create({
            data: {
              quantity: item.quantity,
              selectedSize: item.selectedSize,
              productId: item.productId,
              guestId: guest.id,
            },
            include: {
              product: {
                select: { id: true, name: true, price: true, sizes: true },
              },
            },
          }),
        ),
      );

      return { guest, cartItems };
    });

    // ── 5. Send confirmation email (non-fatal) ───────────────────────────────
    try {
      await sendOrderConfirmation({
        guestId: result.guest.id,
        email: result.guest.email,
        address: result.guest.address,
        whatsappNumber: result.guest.whatsappNumber,
        postalCode: result.guest.postalCode,
        totalPurchased: result.guest.totalPurchased.toNumber(),
        shippingCost: result.guest.shippingCost?.toNumber() ?? 0,
        totalItemsSold: result.guest.totalItemsSold,
        isMember: result.guest.isMember,
        fullname: result.guest.fullname,
        paymentMethod: result.guest.paymentMethod,
        items: result.cartItems.map((item) => ({
          ...item,
          product: { ...item.product, price: item.product.price.toNumber() },
        })),
        baseUrl: API_BASE_URL!,
        createdAt: result.guest.createdAt,
      });
    } catch (error) {
      logger.error("sendOrderConfirmation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        guestId: result.guest.id,
      });
      // Non-fatal: order is saved, continue
    }

    // ── 6. Success response ──────────────────────────────────────────────────
    const totalItems = result.cartItems.reduce((sum, item) => sum + item.quantity, 0);

    logger.info("POST /guests/checkout success", {
      message: `Guest order created with ${totalItems} item(s)`,
      guestId: result.guest.id,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Guest order created successfully with ${totalItems} item${totalItems > 1 ? "s" : ""}.`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("POST /guests/checkout zod error", { error: error.message });
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    logger.error("POST /guests/checkout error", { error: errorMessage });
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
