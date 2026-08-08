import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, errorMessage, getClientIp, logError, logRequest, logResponse, prisma, sendContactInquiryEmails } from "@/lib";

import { buildDateFilter } from "@/utils";

import { ContactInquiryQuerySchema, CreateContactInquirySchema } from "@/types";

/**
 * POST is public — it is the contact form (F-45). GET is the admin inbox (F-47).
 *
 * The two halves of this file have opposite audiences, which is why the auth check
 * sits inside GET rather than at the top of the module: a `checkAuth` guarding both
 * would silently make the public form unusable.
 */

// GET - list inquiries (admin inbox)
export async function GET(request: NextRequest) {
  const pathAPI = "GET /contact-inquiries";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const queryParams = ContactInquiryQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      search: searchParams.get("search") || undefined,
      order: searchParams.get("order") || "desc",
      status: searchParams.get("status") || undefined,
      inquiryType: searchParams.get("inquiryType") || undefined,
      year: searchParams.get("year") || undefined,
      month: searchParams.get("month") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });

    const { search, order, status, inquiryType, year, month, dateFrom, dateTo } = queryParams;

    const page = parseInt(queryParams.page);
    const limit = parseInt(queryParams.limit);
    const skip = (page - 1) * limit;

    const where: Prisma.ContactInquiryWhereInput = {};
    if (status) where.status = status;
    if (inquiryType) where.inquiryType = inquiryType;

    if (search) {
      where.OR = [
        { fullname: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const dateFilter = buildDateFilter({ year, month, dateFrom, dateTo });
    if (dateFilter) where.createdAt = dateFilter;

    const [inquiries, total, unread] = await Promise.all([
      prisma.contactInquiry.findMany({ where, skip, take: limit, orderBy: { createdAt: order }, include: { handledBy: { select: { id: true, username: true } } } }),
      prisma.contactInquiry.count({ where }),
      // Drives the sidebar badge (§B2.3) — counted over every inquiry, not the filtered set.
      prisma.contactInquiry.count({ where: { status: "NEW" } }),
    ]);

    return NextResponse.json({
      success: true,
      data: inquiries,
      unread,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} validation error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => issue.message) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// POST - submit the contact form (public)
export async function POST(request: NextRequest) {
  const pathAPI = "POST /contact-inquiries";
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateContactInquirySchema.parse(body);

    const inquiry = await prisma.contactInquiry.create({
      data: {
        fullname: data.fullname,
        email: data.email,
        phone: data.phone ?? null,
        inquiryType: data.inquiryType,
        // Only meaningful for OTHER; dropped otherwise so a stale value cannot survive
        // the visitor changing their mind about the type before submitting.
        otherDetail: data.inquiryType === "OTHER" ? (data.otherDetail ?? null) : null,
        message: data.message,
      },
    });

    // Notification is best-effort: the row is already saved and the admin inbox is the
    // record of truth, so a Resend outage must not tell the visitor their message failed.
    void sendContactInquiryEmails({
      id: inquiry.id,
      fullname: inquiry.fullname,
      email: inquiry.email,
      phone: inquiry.phone,
      inquiryType: inquiry.inquiryType,
      otherDetail: inquiry.otherDetail,
      message: inquiry.message,
    }).catch((error) => logError(`${pathAPI} email error`, Date.now() - startTime, error));

    logResponse(pathAPI, Date.now() - startTime, { message: "Inquiry received" });
    return NextResponse.json({ success: true, message: "Thank you — we have received your message.", data: { id: inquiry.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} validation error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => issue.message) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
