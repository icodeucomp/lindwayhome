import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { UpdateMemberSchema } from "@/types";

// GET - one member, with their order history summarised
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /members/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const member = await prisma.member.findUnique({ where: { id } });

    if (!member) {
      logger.error(`${pathAPI} error`, { error: "Member not found" });
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    const stats = await prisma.order.aggregate({
      where: { memberId: id, isPurchased: true },
      _count: { _all: true },
      _sum: { totalPurchased: true },
      _max: { createdAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...member,
          orderCount: stats._count._all,
          totalSpent: Number(stats._sum.totalPurchased ?? 0),
          lastOrderAt: stats._max.createdAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

/**
 * PUT - revoke, reinstate, or correct the name.
 *
 * `email` is absent from UpdateMemberSchema on purpose: it is the key checkout looks
 * members up by, so changing it would silently detach somebody from their own
 * membership. Revoking sets `isActive: false` and touches nothing else — every past
 * `Order.isMember` stays exactly as it was, because those orders genuinely were
 * priced at the member rate and rewriting that would make the stored totals lie (D19).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /members/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = UpdateMemberSchema.parse(body);

    const existing = await prisma.member.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "Member not found" });
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...(data.fullname !== undefined ? { fullname: data.fullname || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    const message = data.isActive === false ? "Membership revoked. Past orders keep the member price they were charged." : "Member updated successfully";

    logResponse(pathAPI, Date.now() - startTime, { message });

    return NextResponse.json({ success: true, message, data: member }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// DELETE - only for a member who never ordered
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /members/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const member = await prisma.member.findUnique({ where: { id }, select: { id: true, email: true, _count: { select: { orders: true } } } });

    if (!member) {
      logger.error(`${pathAPI} error`, { error: "Member not found" });
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    // `Order.memberId` is an optional relation, so Prisma would happily null it out
    // and the delete would "succeed" — quietly severing every order from the member
    // who placed it. Revoking is the operation that was actually wanted.
    if (member._count.orders > 0) {
      logger.error(`${pathAPI} error`, { error: "Member has orders" });
      return NextResponse.json(
        { success: false, message: `${member.email} has ${member._count.orders} order(s). Revoke the membership instead — deleting would detach those orders from the person who placed them.` },
        { status: 400 },
      );
    }

    await prisma.member.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Member deleted" });

    return NextResponse.json({ success: true, message: "Member deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
