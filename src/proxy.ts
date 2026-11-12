import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";

// Direct file import, not the `@/services` barrel: the proxy runs on every request and must not
// pull Prisma and the rest of the services in with it.
import {
  TEAM_CHALLENGE_COOKIE,
  TEAM_SESSION_COOKIE,
  checkLogin,
  createChallengeToken,
  createSessionToken,
  currentRealm,
  isConfigured,
  isGateEnabled,
  parseBasicAuth,
  sessionSeconds,
  verifyChallengeToken,
  verifySessionToken,
} from "@/services/team-access";

// Two jobs, in this order:
//  1. The beta password gate (TEAM_ACCESS_GATE=true, set only for the beta container).
//  2. Locale routing. Admin protection stays per-handler via checkAuth (see §A2).
const findLocale = (pathname: string) => locales.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

const preferredLocale = (request: NextRequest) => {
  const header = request.headers.get("accept-language");
  if (!header) return defaultLocale;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase().split("-")[0], quality: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.quality - a.quality);

  return locales.find((locale) => ranked.some((entry) => entry.tag === locale)) ?? defaultLocale;
};

// Everything except admin, the API, Next internals, uploads, and files with an extension.
const skipsLocaleRouting = (pathname: string) => /^\/(admin|api|_next|uploads|images|icons|fonts|favicon\.ico)/.test(pathname) || /\.[\w]+$/.test(pathname);

const routeLocale = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (skipsLocaleRouting(pathname) || findLocale(pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
};

// ── Beta password gate ──────────────────────────────────────────────────────────────────────────
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

// Wrong passwords are counted per client IP so the shared password cannot be guessed at speed.
// In memory, so it resets on restart; nginx also rate limits the API.
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

// nginx appends the real client address last in X-Forwarded-For; anything before it is client-supplied.
const clientIp = (request: NextRequest) => request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";

const isBlocked = (ip: string) => {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
};

const recordFailure = (ip: string) => {
  const entry = failures.get(ip);
  failures.set(ip, entry && entry.resetAt >= Date.now() ? { ...entry, count: entry.count + 1 } : { count: 1, resetAt: Date.now() + FAILURE_WINDOW_MS });
};

const deny = (status: number, message: string, headers: Record<string, string> = {}) =>
  new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...headers } });

/** Returns a response that stops the request, `true` to let it through and set a session cookie, or `false` to let it through. */
const gate = (request: NextRequest): NextResponse | boolean => {
  if (!isGateEnabled()) return false;

  // Xendit's payment callback carries no browser credentials and must always reach the handler.
  if (request.method === "POST" && request.nextUrl.pathname === "/api/payments/xendit/callback") return false;

  // Shut, not open, when the credentials are missing.
  if (!isConfigured()) return deny(503, "Team access is not configured.");

  if (verifySessionToken(request.cookies.get(TEAM_SESSION_COOKIE)?.value)) return false;

  const ip = clientIp(request);
  if (isBlocked(ip)) return deny(429, "Too many failed attempts. Try again in a few minutes.", { "Retry-After": "600" });

  const basic = parseBasicAuth(request.headers.get("authorization"));
  if (basic) {
    // Credentials only count together with this period's challenge cookie, so a browser that
    // re-sent expired credentials by itself is asked again instead of renewed silently.
    if (verifyChallengeToken(request.cookies.get(TEAM_CHALLENGE_COOKIE)?.value)) {
      if (checkLogin(basic.username, basic.password)) return true;
      recordFailure(ip);
    }
  }

  const response = deny(401, "Team sign-in required.", { "WWW-Authenticate": `Basic realm="${currentRealm()}", charset="UTF-8"` });
  response.cookies.set(TEAM_CHALLENGE_COOKIE, createChallengeToken(), { ...cookieOptions, maxAge: sessionSeconds() });
  return response;
};

export function proxy(request: NextRequest) {
  const decision = gate(request);
  if (decision instanceof NextResponse) return decision;

  const response = routeLocale(request);
  if (decision === true) response.cookies.set(TEAM_SESSION_COOKIE, createSessionToken(), { ...cookieOptions, maxAge: sessionSeconds() });
  return response;
}

export const config = {
  // The gate has to see every request, files and API included; locale routing skips those itself.
  matcher: ["/:path*"],
};
