import { NextRequest, NextResponse } from "next/server";

import { errorMessage, getClientIp, logError, logResponse, logger } from "@/lib";
import { TEAM_SESSION_COOKIE, TEAM_SESSION_SECONDS, checkLogin, createSessionToken } from "@/services";
import { TeamLoginSchema } from "@/types";

import { z } from "zod";

// POST - Sign in to the closed sites with the shared team username and password from the env file.
// Public on purpose: nginx lets this one path through (and rate limits it).
export async function POST(request: NextRequest) {
  const pathAPI = "POST /team-access/login";
  const startTime = Date.now();

  try {
    const body = await request.json();

    // The body is not logged: it carries the password.
    const { username, password } = TeamLoginSchema.parse(body);

    if (!checkLogin(username, password)) {
      logger.error(`${pathAPI} error`, { error: "Invalid credentials", ip: getClientIp(request) });
      return NextResponse.json({ success: false, message: "Invalid username or password" }, { status: 401 });
    }

    logResponse(pathAPI, Date.now() - startTime, { message: "Signed in" });

    const response = NextResponse.json({ success: true, message: "Signed in" }, { status: 200 });

    // Set on the parent domain in production so one sign-in covers lindwayhome.com and beta.
    const domain = process.env.TEAM_ACCESS_COOKIE_DOMAIN || undefined;
    response.cookies.set({
      name: TEAM_SESSION_COOKIE,
      value: createSessionToken(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TEAM_SESSION_SECONDS,
      ...(domain ? { domain } : {}),
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logError(`${pathAPI} zod error`, Date.now() - startTime, error);
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? "Validation error" }, { status: 400 });
    }

    logError(`${pathAPI} error`, Date.now() - startTime, error);
    return NextResponse.json({ success: false, message: errorMessage(error) }, { status: 500 });
  }
}
