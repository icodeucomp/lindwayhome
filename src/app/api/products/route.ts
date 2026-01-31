import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";
import { z } from "zod";

import { authenticate, authorize, logger, prisma } from "@/lib";

import { calculateDiscountedPrice } from "@/utils";

import { Categories, CreateProductSchema } from "@/types";

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const order = (searchParams.get("order") || "asc") as Prisma.SortOrder;
    const isActive = searchParams.get("isActive");
    const isFavorite = searchParams.get("isFavorite");

    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

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
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /products error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

// POST - create product
export async function POST(request: NextRequest) {
  const authenticationResult = await authenticate(request);
  const authorizationResult = await authorize(request, "ADMIN");
  if (authenticationResult.message) {
    logger.error("API /products error", { error: authenticationResult.message });
    return NextResponse.json({ success: false, message: authenticationResult.message }, { status: authenticationResult.status });
  }
  if (authorizationResult.message) {
    logger.error("API /products error", { error: authorizationResult.message });
    return NextResponse.json({ success: false, message: authorizationResult.message }, { status: authorizationResult.status });
  }

  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "::1";
    const start = Date.now();
    logger.info("API Request /products", {
      method: request.method,
      body: body,
      url: request.url,
      pathname: request.nextUrl.pathname,
      ip,
    });

    const discountedPrice = calculateDiscountedPrice(body.price, body.discount);

    const createData = CreateProductSchema.parse(body);

    const totalStock = createData.sizes.reduce((sum, sizeObj) => sum + sizeObj.quantity, 0);

    if (totalStock <= 0) {
      logger.error("API /products error", { error: "Total stock must be greater than zero" });
      return NextResponse.json({ success: false, message: "Total stock must be greater than zero" }, { status: 400 });
    }

    if (createData.sku) {
      const existingProduct = await prisma.product.findUnique({ where: { sku: createData.sku } });

      if (existingProduct) {
        logger.error("API /products error", { error: "Product with this SKU already exists" });
        return NextResponse.json({ success: false, message: "Product with this SKU already exists" }, { status: 400 });
      }
    }

    await prisma.product.create({ data: { ...createData, discountedPrice, stock: totalStock } });

    logger.info("API Response /products", {
      message: "Product has been added successfully",
      durationMs: Date.now() - start,
    });

    return NextResponse.json({ success: true, message: "Product has been added successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("API /products error", { error: error.message, stack: error.stack });
      return NextResponse.json({ success: false, message: error.issues }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /products error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
