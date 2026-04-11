import { NextResponse, NextRequest } from "next/server";

import { checkAuth, FileUploader, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { calculateDiscountedPrice } from "@/utils";

import { z } from "zod";

import { Files, UpdateProductSchema } from "@/types";

const uploader = new FileUploader();

// GET - Fetch one product by ID
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /products/${id}`;
  const startTime = Date.now();

  try {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      logger.error(`${pathAPI} error`, { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// PUT - Update a product by ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /products/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const discountedPrice = calculateDiscountedPrice(body.price, body.discount);

    const updateData = UpdateProductSchema.parse({ ...body, discountedPrice });

    const totalStock = updateData.sizes?.reduce((sum, sizeObj) => sum + sizeObj.quantity, 0) || 0;

    const existingProduct = await prisma.product.findUnique({ where: { id } });

    if (!existingProduct) {
      logger.error(`${pathAPI} error`, { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    if (totalStock <= 0) {
      logger.error(`${pathAPI} error`, { error: "Total stock must be greater than zero" });
      return NextResponse.json({ success: false, message: "Total stock must be greater than zero" }, { status: 400 });
    }

    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuConflict = await prisma.product.findUnique({ where: { sku: updateData.sku } });

      if (skuConflict) {
        logger.error(`${pathAPI} error`, { error: "SKU already exists" });
        return NextResponse.json({ success: false, message: "SKU already exists" }, { status: 400 });
      }
    }

    const existingImages = existingProduct.images as unknown as Files[];
    const incomingImages = updateData.images || [];

    const deletedImages = existingImages.filter((existing) => !incomingImages.some((incoming) => incoming.filename === existing.filename));

    const newImages = incomingImages.filter((image) => !image.isMoved);

    const movedImages = await Promise.all([...newImages.map((image) => uploader.moveFromTemp(image, `${updateData.category}/${updateData.sku}`))]);

    await Promise.all(deletedImages.map((image) => uploader.deleteFile(image.path)));

    updateData.images = [...incomingImages.filter((image) => image.isMoved), ...movedImages];

    await prisma.product.update({ where: { id }, data: { ...updateData, stock: totalStock } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Product has been updated successfully", data: body });

    return NextResponse.json({ success: true, message: "Product has been updated successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// DELETE - Delete a product by ID
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /products/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      logger.error(`${pathAPI} error`, { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    await uploader.deleteFolder(`/uploads/${product.category}/${product.sku}`);

    await prisma.product.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Product deleted successfully" });

    return NextResponse.json({ success: true, message: "Product deleted successfully" }, { status: 201 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
