import { NextRequest, NextResponse } from "next/server";

import { TEAM_SESSION_COOKIE, verifySessionToken } from "@/services";

// GET - Is this request's team session valid? nginx calls this (auth_request) before it serves
// anything on the closed sites, so it answers with a bare status and logs nothing.
export async function GET(request: NextRequest) {
  try {
    const valid = verifySessionToken(request.cookies.get(TEAM_SESSION_COOKIE)?.value);
    return new NextResponse(null, { status: valid ? 204 : 401, headers: { "Cache-Control": "no-store" } });
  } catch {
    // A failure here must read as "not signed in", never as a pass.
    return new NextResponse(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}
