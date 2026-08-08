import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticate, checkAuth, errorMessage, getClientIp, logError, logger, logRequest, logResponse, prisma } from "@/lib";

import { UpdateContactInquirySchema } from "@/types";

/** Both handlers are admin-only — this is the contact inbox (F-47), not the form. */

// GET - one inquiry
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `GET /contact-inquiries/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id }, include: { handledBy: { select: { id: true, username: true } } } });

    if (!inquiry) {
      logger.error(`${pathAPI} error`, { error: "Inquiry not found" });
      return NextResponse.json({ success: false, message: "Inquiry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: inquiry });
  } catch (error) {
    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}

// PATCH - move an inquiry through its status, and record how it was handled
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pathAPI = `PATCH /contact-inquiries/${id}`;
  const authError = await checkAuth(request, pathAPI);
  if (authError) return authError;
  const startTime = Date.now();

  try {
    const body = await request.json();
    logRequest(pathAPI, request, body, getClientIp(request));

    const data = UpdateContactInquirySchema.parse(body);

    const existing = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!existing) {
      logger.error(`${pathAPI} error`, { error: "Inquiry not found" });
      return NextResponse.json({ success: false, message: "Inquiry not found" }, { status: 404 });
    }

    // Moving to HANDLED stamps who closed it and when (F-47). The admin is taken from
    // the verified token, never from the request body — otherwise anyone with a session
    // could attribute their work to someone else.
    const becomingHandled = data.status === "HANDLED" && existing.status !== "HANDLED";
    const actor = becomingHandled ? (await authenticate(request)).user : null;

    const inquiry = await prisma.contactInquiry.update({
      where: { id },
      data: {
        status: data.status,
        handlingNote: data.handlingNote,
        ...(becomingHandled ? { handledAt: new Date(), handledById: actor?.id ?? null } : {}),
      },
      include: { handledBy: { select: { id: true, username: true } } },
    });

    logResponse(pathAPI, Date.now() - startTime, { message: "Inquiry updated" });
    return NextResponse.json({ success: true, message: "Inquiry updated", data: inquiry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} validation error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: "Validation error", errors: error.issues.map((issue) => issue.message) }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
