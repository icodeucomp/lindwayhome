import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";

// Locale routing only. This proxy deliberately does NOT authenticate anything —
// admin protection stays per-handler via checkAuth (see CLAUDE.md §A2).
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (findLocale(pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except admin, the API, Next internals, uploads, and files with an extension.
  matcher: ["/((?!admin|api|_next|uploads|images|icons|fonts|favicon.ico|.*\\.[\\w]+$).*)"],
};
