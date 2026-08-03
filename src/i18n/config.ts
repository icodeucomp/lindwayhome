export const locales = ["en", "id"] as const;

export const defaultLocale = "en" satisfies Locale;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  id: "ID",
};

export const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);
