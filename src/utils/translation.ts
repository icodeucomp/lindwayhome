export type Locale = "EN" | "ID";

/** Any row from a `*Translation` table. */
export interface TranslationRow {
  locale: Locale;
  [field: string]: unknown;
}

/**
 * Merges a set of translation rows down to one object for the active locale
 * (CLAUDE.md §B3.2).
 *
 * The merge is **per field, never per record**: if an admin filled the ID name but
 * left the ID description empty, the reader gets the ID name and the EN
 * description. Falling back a whole record would drop a half-translated product
 * entirely to English, which is wrong and looks like a bug to the admin who did
 * the work.
 *
 * EN is assumed to exist — that invariant is enforced on write and by
 * `npm run db:check` (§B4), because `Product` has no name column of its own.
 */
export const resolveTranslation = <T extends TranslationRow>(translations: T[] | undefined | null, locale: Locale): Partial<T> => {
  if (!translations || translations.length === 0) return {};

  const base = translations.find((row) => row.locale === "EN");
  const active = locale === "EN" ? base : translations.find((row) => row.locale === locale);

  if (!active) return (base ?? {}) as Partial<T>;
  if (!base || active === base) return active as Partial<T>;

  const merged: Record<string, unknown> = { ...base };
  for (const [field, value] of Object.entries(active)) {
    // null and "" mean "not translated yet"; 0 and false are real values.
    if (value !== null && value !== undefined && value !== "") merged[field] = value;
  }

  return merged as Partial<T>;
};

/** Convenience for list responses. */
export const withTranslation = <T extends TranslationRow, R extends { translations: T[] }>(record: R, locale: Locale) => ({
  ...record,
  ...resolveTranslation(record.translations, locale),
});
