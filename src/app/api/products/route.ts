import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, FileUploader, getClientIp, logError, logger, logRequest, logResponse, prisma, resolveFiles } from "@/lib";

import { calculateDiscountedPrice } from "@/utils";

import { Categories, CreateProductSchema, ProductQuerySchema } from "@/types";

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
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
      order: searchParams.get("order") || "asc",
      isActive: searchParams.get("isActive") || undefined,
      isFavorite: searchParams.get("isFavorite") || undefined,
      year: searchParams.get("year") || undefined,
      month: searchParams.get("month") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });

    const { category, search, order, isActive, isFavorite, year, month, dateFrom, dateTo } = queryParams;

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (category) where.category = category as Categories;
    if (typeof isActive === "string") where.isActive = isActive === "true";
    if (typeof isFavorite === "string") where.isFavorite = isFavorite === "true";

    if (search) {
      where.OR = [{ id: { contains: search } }, { name: { contains: search } }, { description: { contains: search } }, { sku: { contains: search } }];
    }

    if (year || month || dateFrom || dateTo) {
      const dateFilter: Prisma.DateTimeFilter = {};

      if (year && month) {
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        if (yearNum && monthNum >= 1 && monthNum <= 12) {
          const startDate = new Date(yearNum, monthNum - 1, 1);
          const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

          dateFilter.gte = startDate;
          dateFilter.lte = endDate;
        }
      } else if (year) {
        const yearNum = parseInt(year);
        if (yearNum) {
          const startDate = new Date(yearNum, 0, 1);
          const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);

          dateFilter.gte = startDate;
          dateFilter.lte = endDate;
        }
      } else if (month) {
        const monthNum = parseInt(month);
        const currentYear = new Date().getFullYear();

        if (monthNum >= 1 && monthNum <= 12) {
          const startDate = new Date(currentYear, monthNum - 1, 1);
          const endDate = new Date(currentYear, monthNum, 0, 23, 59, 59, 999);

          dateFilter.gte = startDate;
          dateFilter.lte = endDate;
        }
      }

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          dateFilter.gte = fromDate;
        }
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateFilter.lte = toDate;
        }
      }

      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }
    }

    const [products, total] = await Promise.all([prisma.product.findMany({ where, skip, take: limit, orderBy: { updatedAt: order } }), prisma.product.count({ where })]);

    const responseData = {
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    return NextResponse.json(responseData, { status: 200 });
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

    const discountedPrice = calculateDiscountedPrice(body.price, body.discount);

    const createData = CreateProductSchema.parse({ ...body, discountedPrice });

    const totalStock = createData.sizes.reduce((sum, sizeObj) => sum + sizeObj.quantity, 0);

    if (totalStock <= 0) {
      logger.error(`${pathAPI} error`, { error: "Total stock must be greater than zero" });
      return NextResponse.json({ success: false, message: "Total stock must be greater than zero" }, { status: 400 });
    }

    if (createData.sku) {
      const existingProduct = await prisma.product.findUnique({ where: { sku: createData.sku } });

      if (existingProduct) {
        logger.error(`${pathAPI} error`, { error: "Product with this SKU already exists" });
        return NextResponse.json({ success: false, message: "Product with this SKU already exists" }, { status: 400 });
      }
    }

    if (createData && createData.images) {
      const moved = await Promise.all(createData.images.filter((image) => !image.isMoved).map((image) => uploader.moveFromTemp(image, `${createData.category}/${createData.sku}`)));
      createData.images = [...createData.images.filter((image) => image.isMoved), ...moved];
    }

    const resolvedImages = await resolveFiles([], createData.images, `${createData.category}/${createData.sku}`);

    await prisma.product.create({ data: { ...createData, images: resolvedImages, stock: totalStock } });

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
