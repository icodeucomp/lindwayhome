import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { authenticate, authorize, logger, prisma } from "@/lib";

// GET - Fetch all guests and carts
export async function GET(request: NextRequest) {
  const authenticationResult = await authenticate(request);
  const authorizationResult = await authorize(request, "ADMIN");
  if (authenticationResult.message) {
    logger.error("API /guests error", { error: authenticationResult.message });
    return NextResponse.json({ success: false, message: authenticationResult.message }, { status: authenticationResult.status });
  }
  if (authorizationResult.message) {
    logger.error("API /guests error", { error: authorizationResult.message });
    return NextResponse.json({ success: false, message: authorizationResult.message }, { status: authorizationResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");
    const order = (searchParams.get("order") || "asc") as Prisma.SortOrder;
    const isPurchased = searchParams.get("isPurchased");

    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const skip = (page - 1) * limit;

    const where: Prisma.GuestWhereInput = {};

    if (search) {
      where.OR = [{ id: { contains: search } }, { fullname: { contains: search } }, { email: { contains: search } }];
    }

    if (isPurchased === "true" || isPurchased === "false") {
      const isPurchasedBool = isPurchased === "true";
      where.OR = [{ isPurchased: isPurchasedBool }];
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

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        include: { cartItems: { include: { product: { select: { id: true, name: true, price: true, stock: true, sizes: true, images: true } } } } },
        orderBy: { updatedAt: order },
        skip,
        take: limit,
      }),
      prisma.guest.count({ where }),
    ]);

    const responseData = {
      success: true,
      data: guests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /guests error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
