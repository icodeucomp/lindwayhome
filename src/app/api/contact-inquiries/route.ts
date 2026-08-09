import { NextRequest, NextResponse } from "next/server";

import { $Enums, Prisma } from "prisma-client/client";

import { z } from "zod";

import { checkAuth, contactInquiryInclude, errorMessage, getClientIp, logError, logRequest, logResponse, prisma } from "@/lib";

import { buildDateFilter } from "@/utils";

import { ContactInquiryQuerySchema, CreateContactInquirySchema } from "@/types";

const STATUSES: $Enums.InquiryStatus[] = ["NEW", "IN_PROGRESS", "HANDLED", "ARCHIVED"];

// GET - the admin inbox
export async function GET(request: NextRequest) {
  const pathAPI = "GET /contact-inquiries";
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const queryParams = ContactInquiryQuerySchema.parse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
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

    const [inquiries, total, grouped] = await Promise.all([
      // Newest first: this is a queue, and the thing that just arrived is the thing
      // most likely to need answering.
      prisma.contactInquiry.findMany({ where, include: contactInquiryInclude, orderBy: { createdAt: order }, skip, take: limit }),
      prisma.contactInquiry.count({ where }),
      // Counted across the whole inbox, NOT the filtered set — these drive the status
      // tabs and the sidebar badge, and a badge that changed whenever a filter changed
      // would be telling the admin something other than "this many are waiting".
      prisma.contactInquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const statusCounts = Object.fromEntries(STATUSES.map((entry) => [entry, grouped.find((row) => row.status === entry)?._count._all ?? 0]));

    return NextResponse.json({ success: true, data: inquiries, statusCounts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, { status: 200 });
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
 * POST - submit an inquiry.
 *
 * Public on purpose: this is where the storefront contact form (F-45) will post.
 * `status` and the handling fields are omitted from the create schema, so a caller
 * cannot submit something pre-marked HANDLED.
 */
export async function POST(request: NextRequest) {
  const pathAPI = "POST /contact-inquiries";
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = CreateContactInquirySchema.parse(body);

    // `otherDetail` is only meaningful alongside OTHER. Dropping it otherwise stops a
    // stale value lingering when the sender changes their mind about the type.
    const otherDetail = data.inquiryType === "OTHER" ? data.otherDetail || null : null;

    if (data.inquiryType === "OTHER" && !otherDetail) {
      return NextResponse.json({ success: false, message: "Tell us what your inquiry is about" }, { status: 400 });
    }

    // Trimming and lowercasing already happened in the schema, so what arrives here is
    // storable as-is — one place doing it rather than two disagreeing about it.
    const inquiry = await prisma.contactInquiry.create({
      data: {
        fullname: data.fullname,
        email: data.email,
        phone: data.phone || null,
        inquiryType: data.inquiryType,
        otherDetail,
        message: data.message,
      },
    });

    // F-46 (acknowledgement to the sender, notification to the admin) is not wired
    // yet — it belongs with the storefront form, which does not exist. The inquiry is
    // safely stored either way; the inbox is the source of truth, not the email.

    logResponse(pathAPI, Date.now() - startTime, { message: "Inquiry received", data: inquiry.id });

    return NextResponse.json({ success: true, message: "Thank you — we'll get back to you shortly.", data: { id: inquiry.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
