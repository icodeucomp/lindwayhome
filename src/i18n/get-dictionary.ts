// Server-side only. Import from "@/i18n/get-dictionary" directly, never through the
// "@/i18n" barrel, so client components cannot pull the dictionaries into their bundle.
import type { Locale } from "./config";
import { defaultLocale } from "./config";

import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

// Static imports so the bundler can tree-shake per locale; do not turn this into a
// dynamic template path — Next cannot statically analyse it.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((mod) => mod.default),
  id: () => import("./dictionaries/id.json").then((mod) => mod.default as Dictionary),
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const load = dictionaries[locale] ?? dictionaries[defaultLocale];
  return load();
};
