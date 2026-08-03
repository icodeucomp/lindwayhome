"use client";

import { usePathname } from "next/navigation";

import { localeFromPath, withLocale } from "@/utils/locale-path";

import type { Locale } from "@/i18n/config";

/** Active locale, derived from the URL. Public components only — admin is EN-only (D3). */
export const useLocale = (): Locale => localeFromPath(usePathname() ?? "/");

/** `href("/cart")` → `/id/cart` while browsing in Indonesian. */
export const useLocaleHref = () => {
  const locale = useLocale();
  return (path: string) => withLocale(locale, path);
};
