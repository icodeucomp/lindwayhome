import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticate, checkAuth, contactInquiryInclude, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { UpdateContactInquirySchema } from "@/types";

// GET - one inquiry
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /contact-inquiries/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id }, include: contactInquiryInclude });

    if (!inquiry) {
      logger.error(`${pathAPI} error`, { error: "Inquiry not found" });
      return NextResponse.json({ success: false, message: "Inquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: inquiry }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

/**
 * PUT - move an inquiry through the workflow.
 *
 * Only `status` and `handlingNote` are accepted. The name, email and message are the
 * customer's record, not the admin's to edit — see UpdateContactInquirySchema.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PUT /contact-inquiries/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = UpdateContactInquirySchema.parse(body);

    const existing = await prisma.contactInquiry.findUnique({ where: { id }, select: { id: true, status: true, handledAt: true, handledById: true } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "Inquiry not found" });
      return NextResponse.json({ success: false, message: "Inquiry not found" }, { status: 404 });
    }

    // Who is closing it. checkAuth only answers "may this request proceed", so the
    // identity has to come from the token separately.
    const authResult = await authenticate(request);
    const adminId = "user" in authResult ? authResult.user?.id : undefined;

    const isClosing = data.status === "HANDLED" && existing.status !== "HANDLED";

    const inquiry = await prisma.contactInquiry.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.handlingNote !== undefined ? { handlingNote: data.handlingNote || null } : {}),
        // Stamped once, when it first reaches HANDLED (F-47). Re-saving a handled
        // inquiry must not move the timestamp or reassign who dealt with it.
        ...(isClosing ? { handledAt: new Date(), handledById: adminId } : {}),
      },
      include: contactInquiryInclude,
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Inquiry updated" });

    return NextResponse.json({ success: true, message: "Inquiry updated successfully", data: inquiry }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// DELETE - for spam. Anything genuine should be archived, which keeps the record.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `DELETE /contact-inquiries/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id }, select: { id: true } });

    if (!inquiry) {
      logger.error(`${pathAPI} error`, { error: "Inquiry not found" });
      return NextResponse.json({ success: false, message: "Inquiry not found" }, { status: 404 });
    }

    await prisma.contactInquiry.delete({ where: { id } });

    logResponse(pathAPI, Date.now() - startTime, { message: "Inquiry deleted" });

    return NextResponse.json({ success: true, message: "Inquiry deleted successfully" }, { status: 200 });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
