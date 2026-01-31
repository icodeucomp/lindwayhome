// /app/api/test/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "API is working!",
    success: true,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    message: "POST received successfully",
    data: body,
    success: true,
  });
}
