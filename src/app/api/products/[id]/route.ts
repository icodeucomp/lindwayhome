import { NextResponse, NextRequest } from "next/server";

import { checkAuth, FileUploader, logger, prisma } from "@/lib";

import { calculateDiscountedPrice } from "@/utils";

import { z } from "zod";

import { UpdateProductSchema } from "@/types";

const uploader = new FileUploader();

// GET - Fetch one product by ID
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      logger.error("API /products/[id] error", { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /products/[id] error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

// PUT - Update a product by ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await checkAuth(request, "/products/[id]");
  if (authError) return authError;

  try {
    const { id } = await params;

    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /products/[id]", {
      method: request.method,
      body: body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    const discountedPrice = calculateDiscountedPrice(body.price, body.discount);

    const updateData = UpdateProductSchema.parse({ ...body, discountedPrice });

    const totalStock = updateData.sizes?.reduce((sum, sizeObj) => sum + sizeObj.quantity, 0) || 0;

    const existingProduct = await prisma.product.findUnique({ where: { id } });

    if (!existingProduct) {
      logger.error("API /products/[id] error", { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    if (totalStock <= 0) {
      logger.error("API /products/[id] error", { error: "Total stock must be greater than zero" });
      return NextResponse.json({ success: false, message: "Total stock must be greater than zero" }, { status: 400 });
    }

    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuConflict = await prisma.product.findUnique({ where: { sku: updateData.sku } });

      if (skuConflict) {
        logger.error("API /products/[id] error", { error: "SKU already exists" });
        return NextResponse.json({ success: false, message: "SKU already exists" }, { status: 400 });
      }
    }

    if (updateData && updateData.images) {
      console.log("Moving images from temp to permanent storage for product update:", updateData.images);
      await Promise.all(updateData.images.map((image) => uploader.moveFromTemp(image.filename, `${updateData.category}/${updateData.sku}` || "uncategorized")));
    }

    await prisma.product.update({ where: { id }, data: { ...updateData, stock: totalStock } });

    logger.info("API Response /products/[id]", {
      message: "Product has been updated successfully",
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ success: true, message: "Product has been updated successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("API /products/[id] error", { error: error.message, stack: error.stack });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /products/[id] error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete a product by ID
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await checkAuth(request, "/products/[id]");
  if (authError) return authError;

  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      logger.error("API /products/[id] error", { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    await uploader.deleteFolder(`/uploads/${product.category}/${product.sku}`);

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /products/[id] error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
