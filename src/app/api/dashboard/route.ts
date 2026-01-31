import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { authenticate, authorize, logger, prisma } from "@/lib";

type totalAllStock = { total: number }[];

// GET - Fetch all products
export async function GET(request: NextRequest) {
  const authenticationResult = await authenticate(request);
  const authorizationResult = await authorize(request, "ADMIN");
  if (authenticationResult.message) {
    logger.error("API /config/parameters error", { error: authenticationResult.message });
    return NextResponse.json({ success: false, message: authenticationResult.message }, { status: authenticationResult.status });
  }
  if (authorizationResult.message) {
    logger.error("API /config/parameters error", { error: authorizationResult.message });
    return NextResponse.json({ success: false, message: authorizationResult.message }, { status: authorizationResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);

    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const queryYearAndMonth = year !== "all" && month !== "all" ? `AND EXTRACT(YEAR FROM "createdAt") = ${year} AND EXTRACT(MONTH FROM "createdAt") = ${month}` : "";

    const productWhere: Prisma.ProductWhereInput = {};
    const guestWhere: Prisma.GuestWhereInput = {};

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
        productWhere.createdAt = dateFilter;
        guestWhere.createdAt = dateFilter;
      }
    }

    const totalPendingStats = await prisma.guest.count({ where: { isPurchased: false, ...guestWhere } });
    const totalPurchasedStats = await prisma.guest.aggregate({ where: { isPurchased: true, ...guestWhere }, _count: true, _sum: { totalPurchased: true } });
    const totalItemsSold = await prisma.guest.aggregate({ where: { isPurchased: true, ...guestWhere }, _sum: { totalItemsSold: true } });
    const totalGuest = await prisma.guest.count({ where: guestWhere });
    const totalAllProducts = await prisma.product.count({ where: productWhere });
    const totalAllStockMyLindway: totalAllStock = await prisma.$queryRawUnsafe(
      `SELECT CAST(SUM((s ->> 'quantity')::int) AS INT) AS total FROM "products", unnest(sizes) AS s WHERE category = 'MY_LINDWAY' ${queryYearAndMonth};`,
    );
    const totalAllStockSimplyLindway: totalAllStock = await prisma.$queryRawUnsafe(
      `SELECT CAST(SUM((s ->> 'quantity')::int) AS INT) AS total FROM "products", unnest(sizes) AS s WHERE category = 'SIMPLY_LINDWAY' ${queryYearAndMonth};`,
    );
    const totalAllStockLureByLindway: totalAllStock = await prisma.$queryRawUnsafe(
      `SELECT CAST(SUM((s ->> 'quantity')::int) AS INT) AS total FROM "products", unnest(sizes) AS s WHERE category = 'LURE_BY_LINDWAY' ${queryYearAndMonth};`,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          totalPendingOrders: totalPendingStats,
          totalPurchasedOrders: totalPurchasedStats._count,
          totalPurchasedAmount: totalPurchasedStats._sum.totalPurchased || 0,
          totalItemsSold: totalItemsSold._sum.totalItemsSold || 0,
          totalGuests: totalGuest,
          totalProducts: totalAllProducts,
          totalMyLindwayStock: totalAllStockMyLindway[0].total || 0,
          totalSimplyLindwayStock: totalAllStockSimplyLindway[0].total || 0,
          totalLureByLindwayStock: totalAllStockLureByLindway[0].total || 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : "An unknown error occurred";

    logger.error("API /config/parameters error", { error: errorMessage, stack: errorStack });

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
