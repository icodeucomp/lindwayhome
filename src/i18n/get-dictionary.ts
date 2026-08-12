// Server-side only. Import from "@/i18n/get-dictionary" directly, never through the
// "@/i18n" barrel, so client components cannot pull the dictionaries into their bundle.
import type { Locale } from "./config";
import { defaultLocale } from "./config";

import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

// Static imports so the bundler can tree-shake per locale; do not turn this into a
// dynamic template path — Next cannot statically analyse it.
// No `as Dictionary` on the Indonesian side. The cast used to silence exactly the error
// worth having: a key added to en.json and forgotten in id.json compiled cleanly and
// surfaced as English text on an Indonesian page. Without it, TypeScript names the
// missing key at build time.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((mod) => mod.default),
  id: () => import("./dictionaries/id.json").then((mod) => mod.default),
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const load = dictionaries[locale] ?? dictionaries[defaultLocale];
  return load();
};
