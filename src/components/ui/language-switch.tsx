"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { localeLabels, locales } from "@/i18n/config";

import { localeFromPath, stripLocale } from "@/utils/locale-path";

/** EN / ID switch that keeps the reader on the same page (F-30). */
export const LanguageSwitch = ({ isDark }: { isDark?: boolean }) => {
  const pathname = usePathname() ?? "/";
  const active = localeFromPath(pathname);
  const rest = stripLocale(pathname);

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isDark ? "text-body" : "text-light"}`}>
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 && <span className="opacity-40">/</span>}
          <Link
            href={rest === "/" ? `/${locale}` : `/${locale}${rest}`}
            aria-current={locale === active ? "true" : undefined}
            className={locale === active ? "underline underline-offset-4" : "opacity-60 hover:opacity-100"}
          >
            {localeLabels[locale]}
          </Link>
        </span>
      ))}
    </div>
  );
};
