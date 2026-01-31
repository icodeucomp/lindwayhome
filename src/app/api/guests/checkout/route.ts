import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { ConfigService, ShippingService } from "@/services";

import { logger, prisma, sendOrderConfirmation } from "@/lib";

import { API_BASE_URL, calculateDistance, calculateShippingCost, calculateTotalPrice } from "@/utils";

import { CartSchema, CreateGuestSchema, DiscountType, ShippingCalculateSchema } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province");
    const district = searchParams.get("district");
    const sub_district = searchParams.get("sub_district");
    const village = searchParams.get("village");
    const email = searchParams.get("email");
    const itemsParam = searchParams.get("items");
    const purchasedParam = searchParams.get("purchased"); // NEW: Get purchased amount

    const isValidateEmail = await prisma.guest.findFirst({
      where: { email: email || undefined, isMember: true },
      select: { isMember: true },
    });

    if (!province || !district || !sub_district || !village || !itemsParam || !purchasedParam) {
      logger.error("API /guests/checkout error", { error: "Missing required parameters" });
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 });
    }

    const configParameters = await ConfigService.getConfigValue(["tax_rate", "tax_type", "promotion_discount", "promo_type", "member_discount", "member_type"]);

    const items = JSON.parse(itemsParam);
    const purchased = parseFloat(purchasedParam); // NEW: Parse purchased amount

    // Validate purchased amount
    if (isNaN(purchased) || purchased < 0) {
      logger.error("API /guests/checkout error", { error: "Invalid purchased amount" });
      return NextResponse.json({ success: false, message: "Invalid purchased amount" }, { status: 400 });
    }

    const validatedData = ShippingCalculateSchema.parse({
      province,
      district,
      sub_district,
      village,
      items,
    });

    // =====================
    // 1. GET SHIPPING CONFIG
    // =====================
    const config = await ShippingService.getShippingConfig();
    if (!config) {
      logger.error("API /guests/checkout error", { error: "Shipping configuration not found" });
      return NextResponse.json({ success: false, message: "Shipping configuration not found" }, { status: 404 });
    }

    // =====================
    // 2. GET DESTINATION COORDINATES
    // =====================
    const destinationCoords = await ShippingService.getDestinationCoordinates(validatedData.province, validatedData.district, validatedData.sub_district, validatedData.village);

    if (!destinationCoords) {
      logger.error("API /guests/checkout error", { error: "Destination coordinates not found" });
      return NextResponse.json({ success: false, message: "Destination coordinates not found" }, { status: 404 });
    }

    // =====================
    // 3. CALCULATE DISTANCE
    // =====================
    const distance_km = calculateDistance(config.origin_lat, config.origin_long, destinationCoords.lat, destinationCoords.long, config.earth_radius_km);

    // =====================
    // 4. GET DIMENSIONS FROM CONFIG BY SIZE
    // =====================
    const itemsWithDimensions = [];

    for (const item of validatedData.items) {
      const dimensions = await ShippingService.getProductDimensionsBySize(item.selectedSize);

      if (!dimensions) {
        logger.error("API /guests/checkout error", { error: `Dimensions for size "${item.selectedSize}" not found in configuration.` });
        return NextResponse.json({ success: false, message: `Dimensions for size "${item.selectedSize}" not found in configuration.` }, { status: 404 });
      }

      itemsWithDimensions.push({
        weight_g: dimensions.weight_g,
        length_cm: dimensions.length_cm,
        width_cm: dimensions.width_cm,
        height_cm: dimensions.height_cm,
        quantity: item.quantity,
      });
    }

    // =====================
    // 5. CALCULATE SHIPPING COST
    // =====================
    const calculation = calculateShippingCost(itemsWithDimensions, distance_km, config);

    // =====================
    // 6. CALCULATE TOTAL PRICE (NEW)
    // =====================
    const totalPurchased = calculateTotalPrice({
      basePrice: purchased,
      member: isValidateEmail?.isMember ? (configParameters.member_discount as number) : 0,
      memberType: configParameters.member_type as DiscountType,
      promo: configParameters.promotion_discount as number,
      promoType: configParameters.promo_type as DiscountType,
      tax: configParameters.tax_rate as number,
      taxType: configParameters.tax_type as DiscountType,
      shipping: calculation.shipping_final,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          parameter: {
            ...configParameters,
          },
          shipping: {
            cost: calculation.shipping_final,
            zone: calculation.zone,
            distance_km: parseFloat(calculation.distance_km.toFixed(2)),
            weight_kg: calculation.rounded_weight_kg,
          },
          purchased,
          totalPurchased,
          isMember: isValidateEmail?.isMember,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("API /guests/checkout error", { error: error.message, stack: error.stack });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /guests/checkout error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

// ===========================
// POST API - Create Guest Order
// ===========================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /guests/[id]", {
      method: request.method,
      body: body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    // =====================
    // 1. VALIDATE CART ITEMS
    // =====================

    const { items } = CartSchema.parse(body);

    if (!items || items.length === 0) {
      logger.error("API /guests/checkout error", { error: "Cart items are required" });
      return NextResponse.json({ success: false, message: "Cart items are required" }, { status: 400 });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.productId || !item.selectedSize || !item.quantity) {
        logger.error("API /guests/checkout error", { error: `Item ${i + 1}: Missing required fields (productId, quantity, selectedSize).` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Missing required fields (productId, quantity, selectedSize).` }, { status: 400 });
      }

      if (item.quantity <= 0) {
        logger.error("API /guests/checkout error", { error: `Item ${i + 1}: Quantity must be greater than 0.` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Quantity must be greater than 0.` }, { status: 400 });
      }

      if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity)) {
        logger.error("API /guests/checkout error", { error: `Item ${i + 1}: Quantity must be a valid integer.` });
        return NextResponse.json({ success: false, message: `Item ${i + 1}: Quantity must be a valid integer.` }, { status: 400 });
      }
    }

    // =====================
    // 2. VALIDATE SHIPPING COST PROVIDED
    // =====================

    if (typeof body.shippingCost !== "number" || body.shippingCost < 0) {
      logger.error("API /guests/checkout error", { error: "Valid shipping cost is required" });
      return NextResponse.json({ success: false, message: "Valid shipping cost is required" }, { status: 400 });
    }

    // =====================
    // 3. PREPARE GUEST DATA
    // =====================

    const createData = CreateGuestSchema.parse(body);

    // =====================
    // 4. DATABASE TRANSACTION
    // =====================

    const result = await prisma.$transaction(async (tx) => {
      // Validate products and sizes exist
      for (const item of items) {
        const { productId, selectedSize } = item;

        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, name: true, isActive: true, sizes: true },
        });

        if (!product) {
          throw new Error(`Product with ID "${productId}" not found.`);
        }

        if (!product.isActive) {
          throw new Error(`Product "${product.name}" is not available for purchase.`);
        }

        if (!product.sizes || !Array.isArray(product.sizes)) {
          throw new Error(`Size information is not available for product "${product.name}".`);
        }

        const sizes = product.sizes as Array<{ size: string; quantity: number }>;
        const sizeData = sizes.find((s) => s.size === selectedSize);

        if (!sizeData) {
          throw new Error(`Selected size "${selectedSize}" is not available for product "${product.name}".`);
        }

        if (sizeData.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product "${product.name}" size "${selectedSize}". Available: ${sizeData.quantity}, Requested: ${item.quantity}`);
        }
      }

      // Create guest record
      const guest = await tx.guest.create({
        data: createData,
      });

      // Create cart items
      const cartItems = [];
      for (const item of items) {
        const cartItem = await tx.cart.create({
          data: {
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            productId: item.productId,
            guestId: guest.id,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                sizes: true,
              },
            },
          },
        });
        cartItems.push(cartItem);
      }

      return { guest, cartItems };
    });

    // =====================
    // 5. SEND CONFIRMATION EMAIL
    // =====================

    try {
      await sendOrderConfirmation({
        guestId: result.guest.id,
        email: result.guest.email,
        address: result.guest.address,
        whatsappNumber: result.guest.whatsappNumber,
        postalCode: result.guest.postalCode,
        totalPurchased: result.guest.totalPurchased.toNumber(),
        shippingCost: result.guest.shippingCost?.toNumber() || 0,
        totalItemsSold: result.guest.totalItemsSold,
        isMember: result.guest.isMember,
        fullname: result.guest.fullname,
        paymentMethod: result.guest.paymentMethod,
        items: result.cartItems.map((item) => ({
          ...item,
          product: {
            ...item.product,
            price: item.product.price.toNumber(),
          },
        })),
        baseUrl: API_BASE_URL!,
        createdAt: result.guest.createdAt,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

      logger.error("API /guests/checkout error", { error: errorMessage, stack: errorStack });
    }

    // =====================
    // 6. RETURN SUCCESS RESPONSE
    // =====================

    const totalItems = result.cartItems.reduce((sum, item) => sum + item.quantity, 0);

    logger.info("API Response /guests/checkout", {
      message: `Guest order created successfully with ${totalItems} item${totalItems > 1 ? "s" : ""}.`,
      durationMs: Date.now() - start,
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
      logger.error("API /guests/checkout error", { error: error.message, stack: error.stack });
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
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /guests/checkout error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
