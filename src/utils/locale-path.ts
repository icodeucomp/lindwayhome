import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";

/** Reads the locale out of a pathname like `/id/cart`, falling back to the default. */
export const localeFromPath = (pathname: string): Locale => {
  const segment = pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : defaultLocale;
};

/** Strips the locale segment: `/id/cart` → `/cart`. Used by the language switcher. */
export const stripLocale = (pathname: string): string => {
  const segment = pathname.split("/")[1] ?? "";
  if (!isLocale(segment)) return pathname;
  const rest = pathname.slice(segment.length + 1);
  return rest === "" ? "/" : rest;
};

/**
 * Prefixes an internal path with the active locale. Leaves alone anything that is
 * already localized, external, an anchor, or an admin/API route.
 */
export const withLocale = (locale: Locale, href: string): string => {
  if (!href.startsWith("/")) return href;
  if (href.startsWith("/admin") || href.startsWith("/api") || href.startsWith("/uploads")) return href;

  const segment = href.split("/")[1] ?? "";
  if ((locales as readonly string[]).includes(segment)) return href;

  return href === "/" ? `/${locale}` : `/${locale}${href}`;
};
