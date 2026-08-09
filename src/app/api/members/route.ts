import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { buildDateFilter } from "@/utils";

import { CreateMemberSchema, MemberQuerySchema } from "@/types";

/**
 * Order totals for a page of members, in one query rather than per row.
 *
 * Only verified orders count: an unverified one has not been paid, and showing it as
 * spend would overstate what a member is actually worth.
 */
const statsFor = async (memberIds: string[]) => {
  if (memberIds.length === 0) return new Map<string, { orderCount: number; totalSpent: number; lastOrderAt: Date | null }>();

  const grouped = await prisma.order.groupBy({
    by: ["memberId"],
    where: { memberId: { in: memberIds }, isPurchased: true },
    _count: { _all: true },
    _sum: { totalPurchased: true },
    _max: { createdAt: true },
  });

  return new Map(
    grouped.map((row) => [
      row.memberId as string,
      { orderCount: row._count._all, totalSpent: Number(row._sum.totalPurchased ?? 0), lastOrderAt: row._max.createdAt },
    ]),
  );
};

// GET - the member registry
export async function GET(request: NextRequest) {
  const pathAPI = "GET /members";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const queryParams = MemberQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      search: searchParams.get("search") || undefined,
      order: searchParams.get("order") || "desc",
      isActive: searchParams.get("isActive") || undefined,
      year: searchParams.get("year") || undefined,
      month: searchParams.get("month") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });

    const { search, order, isActive, year, month, dateFrom, dateTo } = queryParams;

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.MemberWhereInput = {};

    if (isActive === "true" || isActive === "false") where.isActive = isActive === "true";

    if (search) {
      where.OR = [{ email: { contains: search, mode: "insensitive" } }, { fullname: { contains: search, mode: "insensitive" } }];
    }

    const dateFilter = buildDateFilter({ year, month, dateFrom, dateTo });
    if (dateFilter) where.createdAt = dateFilter;

    const [members, total, activeCount] = await Promise.all([
      prisma.member.findMany({ where, orderBy: { createdAt: order }, skip, take: limit }),
      prisma.member.count({ where }),
      // Across the whole registry, not the filtered set — the header reads "of N
      // members", which should not move when a filter does.
      prisma.member.count({ where: { isActive: true } }),
    ]);

    const stats = await statsFor(members.map((member) => member.id));

    const data = members.map((member) => ({
      ...member,
      orderCount: stats.get(member.id)?.orderCount ?? 0,
      totalSpent: stats.get(member.id)?.totalSpent ?? 0,
      lastOrderAt: stats.get(member.id)?.lastOrderAt ?? null,
    }));

    return NextResponse.json({ success: true, data, activeCount, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

/**
 * POST - grant membership by hand.
 *
 * Buyers normally join through the post-order page (§B6.4), which upserts. This is
 * the same operation for an admin doing it on request, and it upserts for the same
 * reason: re-granting to somebody previously revoked should reinstate them, not
 * fail on the unique email.
 */
export async function POST(request: NextRequest) {
  const pathAPI = "POST /members";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateMemberSchema.parse(body);

    const existing = await prisma.member.findUnique({ where: { email: data.email }, select: { id: true, isActive: true } });

    if (existing?.isActive) {
      logger.error(`${pathAPI} error`, { error: "Member already exists" });
      return NextResponse.json({ success: false, message: `${data.email} is already an active member` }, { status: 400 });
    }

    const member = await prisma.member.upsert({
      where: { email: data.email },
      create: { email: data.email, fullname: data.fullname || null },
      update: { isActive: true, ...(data.fullname ? { fullname: data.fullname } : {}) },
    });

    const message = existing ? `${data.email} was previously revoked and has been reinstated` : "Membership granted";

    logResponse(pathAPI, Date.now() - startTime, { message, data: member.id });

    return NextResponse.json({ success: true, message, data: { id: member.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
