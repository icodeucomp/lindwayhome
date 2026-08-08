"use client";

import { usePathname } from "next/navigation";

import { localeFromPath, withLocale } from "@/utils/locale-path";

import type { Locale } from "@/i18n/config";

import type { Locale as ApiLocale } from "@/types";

/** Active locale, derived from the URL. Public components only — admin is EN-only (D3). */
export const useLocale = (): Locale => localeFromPath(usePathname() ?? "/");

/**
 * The URL segment is lowercase (`/id/...`) but the API and the `Locale` enum are
 * uppercase (`ID`). Every storefront query needs the conversion, so it lives here
 * rather than being re-derived with `.toUpperCase()` — which returns a plain `string`
 * and loses the union at each call site.
 */
export const useApiLocale = (): ApiLocale => (useLocale() === "id" ? "ID" : "EN");

/** `href("/cart")` → `/id/cart` while browsing in Indonesian. */
export const useLocaleHref = () => {
  const locale = useLocale();
  return (path: string) => withLocale(locale, path);
};
