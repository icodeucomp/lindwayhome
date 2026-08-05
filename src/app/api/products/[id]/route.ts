import { NextResponse, NextRequest } from "next/server";

import { checkAuth, getClientIp, logError, logger, logRequest, logResponse, prisma, productInclude, resolveFiles, toTranslationCreate, toVariantCreate } from "@/lib";

import { calculateDiscountedPrice, nullToUndefined, resolveTranslation, type Locale } from "@/utils";

import { z } from "zod";

import { UpdateProductSchema } from "@/types";

// GET - Fetch one product by id or slug
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /products/${id}`;
  const startTime = Date.now();

  try {
    const locale = (new URL(request.url).searchParams.get("locale") || "EN") as Locale;

    // Public pages address products by slug (D4); admin still uses the id.
    const product = await prisma.product.findFirst({ where: { OR: [{ id }, { slug: id }] }, include: productInclude });

    if (!product) {
      logger.error(`${pathAPI} error`, { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { ...product, ...resolveTranslation(product.translations, locale) } });
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

    const discountedPrice = body.price != null ? calculateDiscountedPrice(body.price, body.discount ?? 0) : undefined;

    const updateData = UpdateProductSchema.parse({ ...body, ...(discountedPrice != null ? { discountedPrice } : {}) });

    const existingProduct = await prisma.product.findUnique({ where: { id }, include: { translations: true } });

    if (!existingProduct) {
      logger.error(`${pathAPI} error`, { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    if (updateData.variants) {
      const totalStock = updateData.variants.reduce((sum, variant) => sum + variant.quantity, 0);
      if (totalStock <= 0) {
        logger.error(`${pathAPI} error`, { error: "Total stock must be greater than zero" });
        return NextResponse.json({ success: false, message: "Total stock must be greater than zero" }, { status: 400 });
      }
    }

    if (updateData.translations && !updateData.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    for (const [field, value] of [
      ["sku", updateData.sku],
      ["slug", updateData.slug],
    ] as const) {
      if (!value || value === existingProduct[field]) continue;
      const conflict = await prisma.product.findFirst({ where: { [field]: value }, select: { id: true } });
      if (conflict) {
        logger.error(`${pathAPI} error`, { error: `${field.toUpperCase()} already exists` });
        return NextResponse.json({ success: false, message: `${field.toUpperCase()} already exists` }, { status: 400 });
      }
    }

    const folder = `products/${updateData.sku ?? existingProduct.sku}`;
    const resolvedImages = updateData.images ? await resolveFiles(existingProduct.images, updateData.images, folder) : undefined;

    const { variants, translations, sizeGuideId, garment, releasedAt, bestSellerRank, images, ...product } = updateData;

    // Variants and translations are replaced wholesale rather than diffed: the admin
    // form always submits the complete set, and deleting a variant must actually
    // remove the row so the stock trigger recomputes without it (D24).
    await prisma.$transaction(async (tx) => {
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
      }
      if (translations) {
        await tx.productTranslation.deleteMany({ where: { productId: id } });
      }

      await tx.product.update({
        where: { id },
        data: {
          ...product,
          ...(images ? { images: resolvedImages } : {}),
          ...(sizeGuideId !== undefined ? { sizeGuideId: nullToUndefined(sizeGuideId) } : {}),
          ...(garment !== undefined ? { garment: nullToUndefined(garment) } : {}),
          ...(releasedAt !== undefined ? { releasedAt: nullToUndefined(releasedAt) } : {}),
          ...(bestSellerRank !== undefined ? { bestSellerRank: nullToUndefined(bestSellerRank) } : {}),
          ...(variants ? { variants: { create: variants.map(toVariantCreate) } } : {}),
          ...(translations ? { translations: { create: translations.map(toTranslationCreate) } } : {}),
        },
      });
    });

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

// DELETE - soft delete once the product has been ordered (A9.13)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /products/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true, sku: true, _count: { select: { orderItems: true } } } });

    if (!product) {
      logger.error(`${pathAPI} error`, { error: "Product not found" });
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    // A product that has been ordered cannot be removed without destroying order
    // history, and the foreign key would refuse anyway — v1 returned a raw database
    // error here. Deactivating keeps the history intact and hides it from the store.
    if (product._count.orderItems > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });

      logResponse(pathAPI, Date.now() - startTime, { message: "Product deactivated" });
      return NextResponse.json(
        { success: true, message: "This product has orders, so it was deactivated instead of deleted. It no longer appears in the store." },
        { status: 200 },
      );
    }

    await prisma.product.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Product deleted successfully" });

    return NextResponse.json({ success: true, message: "Product deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
