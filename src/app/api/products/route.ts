import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, FileUploader, getClientIp, logError, logger, logRequest, logResponse, prisma, productInclude, resolveFiles, toTranslationCreate, toVariantCreate } from "@/lib";

import { buildDateFilter, calculateDiscountedPrice, nullToUndefined, resolveTranslation, type Locale } from "@/utils";

import { CreateProductSchema, ProductQuerySchema } from "@/types";



const uploader = new FileUploader();

// GET - Fetch all products
export async function GET(request: NextRequest) {
  const pathAPI = "GET /products";
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const queryParams = ProductQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      locale: searchParams.get("locale") || "EN",
      branding: searchParams.get("branding") || undefined,
      garment: searchParams.get("garment") || undefined,
      audience: searchParams.get("audience") || undefined,
      search: searchParams.get("search") || undefined,
      order: searchParams.get("order") || "asc",
      sort: searchParams.get("sort") || "latest",
      isActive: searchParams.get("isActive") || undefined,
      isFavorite: searchParams.get("isFavorite") || undefined,
      year: searchParams.get("year") || undefined,
      month: searchParams.get("month") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });

    const { locale, branding, garment, audience, search, order, sort, isActive, isFavorite, year, month, dateFrom, dateTo } = queryParams;

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (branding) where.branding = branding as Prisma.EnumBrandingTypeFilter["equals"];
    if (garment) where.garment = garment as Prisma.EnumGarmentTypeNullableFilter["equals"];
    if (audience) where.audiences = { has: audience as Prisma.EnumAudienceTypeNullableListFilter["has"] };
    if (typeof isActive === "string") where.isActive = isActive === "true";
    if (typeof isFavorite === "string") where.isFavorite = isFavorite === "true";

    // Search has to reach the translation table, and it has to look at EN as well as
    // the active locale — otherwise a product nobody has translated yet becomes
    // invisible the moment a visitor switches to Indonesian (§B3.3).
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { sku: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { translations: { some: { locale: { in: ["EN", locale] }, name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const dateFilter = buildDateFilter({ year, month, dateFrom, dateTo });
    if (dateFilter) where.createdAt = dateFilter;

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = (() => {
      switch (sort) {
        case "new-arrivals":
          return [{ releasedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
        case "best-sellers":
          return [{ bestSellerRank: { sort: "asc", nulls: "last" } }, { soldCount: "desc" }];
        case "price-asc":
          return [{ discountedPrice: "asc" }];
        case "price-desc":
          return [{ discountedPrice: "desc" }];
        default:
          return [{ updatedAt: order }];
      }
    })();

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limit, orderBy, include: productInclude }),
      prisma.product.count({ where }),
    ]);

    // Flatten translations per field for the requested locale (§B3.2).
    const data = products.map((product) => ({ ...product, ...resolveTranslation(product.translations, locale as Locale) }));

    return NextResponse.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}

// POST - create product
export async function POST(request: NextRequest) {
  const pathAPI = "POST /products";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();

    const ip = getClientIp(request);
    logRequest(pathAPI, request, body, ip);

    const discountedPrice = calculateDiscountedPrice(body.price, body.discount ?? 0);

    const createData = CreateProductSchema.parse({ ...body, discountedPrice });

    // Prisma cannot express "one translation must be EN", and the whole fallback
    // chain assumes it exists — a product without one renders nameless everywhere,
    // because Product has no name column (§B4).
    if (!createData.translations.some((translation) => translation.locale === "EN")) {
      logger.error(`${pathAPI} error`, { error: "An EN translation is required" });
      return NextResponse.json({ success: false, message: "An EN translation is required" }, { status: 400 });
    }

    const totalStock = createData.variants.reduce((sum, variant) => sum + variant.quantity, 0);
    if (totalStock <= 0) {
      logger.error(`${pathAPI} error`, { error: "Total stock must be greater than zero" });
      return NextResponse.json({ success: false, message: "Total stock must be greater than zero" }, { status: 400 });
    }

    const [skuTaken, slugTaken] = await Promise.all([
      prisma.product.findUnique({ where: { sku: createData.sku }, select: { id: true } }),
      prisma.product.findUnique({ where: { slug: createData.slug }, select: { id: true } }),
    ]);

    if (skuTaken) {
      logger.error(`${pathAPI} error`, { error: "Product with this SKU already exists" });
      return NextResponse.json({ success: false, message: "Product with this SKU already exists" }, { status: 400 });
    }
    if (slugTaken) {
      logger.error(`${pathAPI} error`, { error: "Product with this slug already exists" });
      return NextResponse.json({ success: false, message: "Product with this slug already exists" }, { status: 400 });
    }

    // Images live under products/<sku>/ rather than <branding>/<sku>/ — branding is
    // now a mutable enum, and re-tagging a product must not strand its files.
    const folder = `products/${createData.sku}`;
    const moved = await Promise.all(createData.images.filter((image) => !image.isMoved).map((image) => uploader.moveFromTemp(image, folder)));
    const resolvedImages = await resolveFiles([], [...createData.images.filter((image) => image.isMoved), ...moved], folder);

    const { variants, translations, sizeGuideId, garment, releasedAt, bestSellerRank, ...product } = createData;

    await prisma.product.create({
      data: {
        ...product,
        // Prisma wants `undefined` for an absent optional column, not `null`.
        sizeGuideId: nullToUndefined(sizeGuideId),
        garment: nullToUndefined(garment),
        releasedAt: nullToUndefined(releasedAt),
        bestSellerRank: nullToUndefined(bestSellerRank),
        images: resolvedImages as unknown as Prisma.InputJsonValue[],
        // `stock` is deliberately absent — the product_variant_stock_sync trigger
        // derives it from the variants below (D24).
        variants: { create: variants.map(toVariantCreate) },
        translations: { create: translations.map(toTranslationCreate) },
      },
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Product has been added successfully" });

    return NextResponse.json({ success: true, message: "Product has been added successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
