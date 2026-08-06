import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import z from "zod";

import { checkAuth, errorMessage, logError, orderInclude, prisma } from "@/lib";

import { buildDateFilter } from "@/utils";

import { OrderQuerySchema } from "@/types";

// GET - Fetch all orders
export async function GET(request: NextRequest) {
  const pathAPI = "GET /orders";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const queryParams = OrderQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      search: searchParams.get("search") || undefined,
      order: searchParams.get("order") || "asc",
      isPurchased: searchParams.get("isPurchased") || undefined,
      status: searchParams.get("status") || undefined,
      paymentMethod: searchParams.get("paymentMethod") || undefined,
      year: searchParams.get("year") || undefined,
      month: searchParams.get("month") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });

    const { search, order, isPurchased, status, paymentMethod, year, month, dateFrom, dateTo } = queryParams;

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (search) {
      where.OR = [
        { id: { contains: search } },
        { fullname: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { trackingNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // v1 assigned this to `where.OR`, which quietly discarded the search filter
    // whenever both were supplied. They are separate conditions.
    if (isPurchased === "true" || isPurchased === "false") where.isPurchased = isPurchased === "true";
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const dateFilter = buildDateFilter({ year, month, dateFrom, dateTo });
    if (dateFilter) where.createdAt = dateFilter;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: orderInclude, orderBy: { updatedAt: order }, skip, take: limit }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
