import { NextRequest, NextResponse } from "next/server";

import { checkAuth, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { z } from "zod";

import { UpdateGuestSchema } from "@/types";

// GET - Fetch one guest and carts by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /guests/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                sizes: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!guest) {
      logger.error(`${pathAPI} error`, { error: "Guest not found" });
      return NextResponse.json({ success: false, message: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: guest }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// PUT - Update guests and carts by ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /guests/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const updateData = UpdateGuestSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const existingGuest = await tx.guest.findUnique({
        where: { id },
        include: { cartItems: { include: { product: { select: { id: true, name: true, price: true, stock: true, sizes: true, isActive: true } } } } },
      });

      if (!existingGuest) {
        throw new Error("Guest not found");
      }

      if (updateData.isPurchased === true && !existingGuest.isPurchased) {
        const productIds = [...Array.from(existingGuest.cartItems.map((item) => item.product.id))];

        await Promise.all(
          productIds.map(async (productId) => {
            const productCartItems = existingGuest.cartItems.filter((item) => item.product.id === productId);
            const product = productCartItems[0].product;

            if (!product.isActive) {
              throw new Error(`Product "${product.name}" is no longer available for purchase.`);
            }

            if (!product.sizes || !Array.isArray(product.sizes)) {
              throw new Error(`Size information is not available for product "${product.name}".`);
            }

            const freshProduct = await tx.product.findUnique({ where: { id: productId }, select: { sizes: true, name: true } });

            if (!freshProduct) {
              throw new Error(`Product "${product.name}" not found.`);
            }

            const updatedSizes = [...(freshProduct.sizes as Array<{ size: string; quantity: number }>)];

            productCartItems.forEach((cartItem) => {
              const sizeIndex = updatedSizes.findIndex((s) => s.size === cartItem.selectedSize);

              if (sizeIndex === -1) {
                throw new Error(`Selected size "${cartItem.selectedSize}" is no longer available for product "${product.name}".`);
              }

              const currentQuantity = updatedSizes[sizeIndex].quantity;

              if (currentQuantity < cartItem.quantity) {
                throw new Error(
                  `Insufficient stock for product "${product.name}" in size "${cartItem.selectedSize}". ` + `Only ${currentQuantity} items available, but ${cartItem.quantity} requested.`,
                );
              }

              updatedSizes[sizeIndex] = { ...updatedSizes[sizeIndex], quantity: currentQuantity - cartItem.quantity };
            });

            const newTotalStock = updatedSizes.reduce((total, size) => total + size.quantity, 0);

            await tx.product.update({ where: { id: productId }, data: { sizes: updatedSizes, stock: newTotalStock } });
          }),
        );
      }

      const updatedGuest = await tx.guest.update({
        where: { id },
        data: { ...updateData, updatedAt: new Date() },
        include: { cartItems: { include: { product: { select: { id: true, name: true, price: true, stock: true, sizes: true } } } } },
      });

      return updatedGuest;
    });

    logResponse(pathAPI, Date.now() - startTime, { message: `Guest updated successfully. ${result.cartItems.reduce((sum, cart) => sum + cart.quantity, 0)} items in cart.` });

    return NextResponse.json(
      {
        success: true,
        message: `Guest updated successfully. ${result.cartItems.reduce((sum, cart) => sum + cart.quantity, 0)} items in cart.`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
