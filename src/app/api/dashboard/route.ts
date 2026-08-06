import { NextRequest, NextResponse } from "next/server";

import { $Enums, Prisma } from "prisma-client/client";

import { checkAuth, logError, prisma } from "@/lib";

import { buildDateFilter } from "@/utils";

// Ordered as the lifecycle runs, not alphabetically — the dashboard renders it as a
// funnel, so the order is meaningful rather than cosmetic.
const ORDER_STATUSES: $Enums.OrderStatus[] = ["AWAITING_PAYMENT", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"];

/**
 * Local calendar day, deliberately NOT `toISOString().slice(0, 10)`.
 *
 * The trend window starts at local midnight, but toISOString renders UTC — east of
 * Greenwich the two disagree by a day, so today's bucket was keyed as yesterday while
 * today's orders keyed as today and matched nothing. They dropped off the chart
 * silently, which reads as "no orders today" rather than as a bug.
 */
const localDayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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

    // The trend window is always "the last 30 days" — it is a fixed-length series, so
    // it deliberately ignores the month/year filter the rest of the panel responds to.
    const trendStart = new Date();
    trendStart.setHours(0, 0, 0, 0);
    trendStart.setDate(trendStart.getDate() - 29);

    const [pending, purchased, itemsSold, totalOrders, totalProducts, totalMembers, byBranding, byStatus, trendRows, latestOrders, draftProducts] = await Promise.all([
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
      prisma.order.groupBy({ by: ["status"], where: orderWhere, _count: { _all: true } }),
      // Bucketed in JS rather than SQL: Prisma cannot group by day, and date_trunc
      // would mean going back to raw SQL — the thing A9.5 was about.
      prisma.order.findMany({ where: { createdAt: { gte: trendStart } }, select: { createdAt: true, paymentMethod: true } }),
      prisma.order.findMany({
        where: orderWhere,
        select: { id: true, fullname: true, email: true, totalPurchased: true, status: true, isPurchased: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.product.count({ where: { ...productWhere, isActive: false } }),
    ]);

    const buckets = new Map<string, { bankTransfer: number; qris: number }>();
    for (let offset = 0; offset < 30; offset += 1) {
      const day = new Date(trendStart);
      day.setDate(trendStart.getDate() + offset);
      buckets.set(localDayKey(day), { bankTransfer: 0, qris: 0 });
    }

    for (const row of trendRows) {
      const bucket = buckets.get(localDayKey(row.createdAt));
      if (!bucket) continue;
      if (row.paymentMethod === "QRIS") bucket.qris += 1;
      else bucket.bankTransfer += 1;
    }

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
          inactiveProducts: draftProducts,
          // One row per branding that actually has products, rather than three
          // hardcoded fields that would need a code change per new brand line.
          stockByBranding: byBranding.map((row) => ({
            branding: row.branding,
            stock: row._sum.stock ?? 0,
            products: row._count._all,
          })),
          // Every status is emitted, including the ones at zero — a pipeline that hides
          // its empty stages reads as though those stages do not exist.
          statusPipeline: ORDER_STATUSES.map((status) => ({
            status,
            count: byStatus.find((row) => row.status === status)?._count._all ?? 0,
          })),
          ordersByDay: [...buckets.entries()].map(([date, counts]) => ({ date, ...counts })),
          latestOrders,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: error }, { status: 500 });
  }
}
