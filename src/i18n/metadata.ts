import type { Metadata } from "next";

import { defaultLocale, locales, type Locale } from "./config";

/**
 * Page metadata with its language alternates (CLAUDE.md §B3.3).
 *
 * Every localized page needs `hreflang` links, and until now none had them: search
 * engines saw `/en/about` and `/id/about` as two unrelated pages with identical
 * content, which is worse for ranking than having one. Generating them per page by
 * hand would mean twenty chances to forget, so one helper owns it.
 *
 * `x-default` points at the default locale, which is what a crawler falls back to when
 * the reader's language is neither of ours.
 *
 * `path` is the route WITHOUT the locale segment — "/about", "/customer-care/faq", or
 * "/" for the homepage. The locale prefix is added here so a caller cannot get the
 * pairing wrong.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

const localizedPath = (locale: Locale, path: string) => (path === "/" ? `/${locale}` : `/${locale}${path}`);

export interface PageMeta {
  title: string;
  description: string;
}

export const localizedMetadata = (locale: Locale, path: string, meta: PageMeta): Metadata => {
  const languages = Object.fromEntries([
    ...locales.map((entry) => [entry, localizedPath(entry, path)]),
    ["x-default", localizedPath(defaultLocale, path)],
  ]);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}${localizedPath(locale, path)}`,
      siteName: "Lindway",
      locale: locale === "id" ? "id_ID" : "en_US",
      type: "website",
    },
  };
};
