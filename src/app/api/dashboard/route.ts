import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { checkAuth, logError, prisma } from "@/lib";

import { buildDateFilter } from "@/utils";

// GET - dashboard metrics
export async function GET(request: NextRequest) {
  const pathAPI = "GET /dashboard";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    // v1 interpolated `year` and `month` straight into $queryRawUnsafe to sum
    // `unnest(sizes)` per category (A9.5). Variants are a real relation now, so the
    // whole thing is an ordinary groupBy and the raw SQL — and its injection
    // surface — is gone.
    const dateFilter = buildDateFilter({
      year: searchParams.get("year") ?? undefined,
      month: searchParams.get("month") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });

    const productWhere: Prisma.ProductWhereInput = dateFilter ? { createdAt: dateFilter } : {};
    const orderWhere: Prisma.OrderWhereInput = dateFilter ? { createdAt: dateFilter } : {};

    const [pending, purchased, itemsSold, totalOrders, totalProducts, totalMembers, byBranding] = await Promise.all([
      prisma.order.count({ where: { isPurchased: false, ...orderWhere } }),
      prisma.order.aggregate({ where: { isPurchased: true, ...orderWhere }, _count: true, _sum: { totalPurchased: true } }),
      prisma.order.aggregate({ where: { isPurchased: true, ...orderWhere }, _sum: { totalItemsSold: true } }),
      prisma.order.count({ where: orderWhere }),
      prisma.product.count({ where: productWhere }),
      prisma.member.count(),
      prisma.product.groupBy({
        by: ["branding"],
        where: productWhere,
        _sum: { stock: true },
        _count: { _all: true },
        orderBy: { branding: "asc" },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalPendingOrders: pending,
          totalPurchasedOrders: purchased._count,
          totalPurchasedAmount: purchased._sum.totalPurchased ?? 0,
          totalItemsSold: itemsSold._sum.totalItemsSold ?? 0,
          totalOrders,
          totalProducts,
          totalMembers,
          // One row per branding that actually has products, rather than three
          // hardcoded fields that would need a code change per new brand line.
          stockByBranding: byBranding.map((row) => ({
            branding: row.branding,
            stock: row._sum.stock ?? 0,
            products: row._count._all,
          })),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
