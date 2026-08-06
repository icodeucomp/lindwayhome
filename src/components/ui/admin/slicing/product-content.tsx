"use client";

import type { JSONContent } from "@tiptap/react";

import { Locale, RichText } from "@/types";

import { LocaleTabs, RichTextField } from "./form";

/** No `name` — it is a single untranslated column on Product (D26). */
export interface TranslationDraft {
  description: RichText | null;
  notes: RichText | null;
  fabricInformation: RichText | null;
  shippingDelivery: RichText | null;
  returnPolicy: RichText | null;
}

export const EMPTY_TRANSLATION: TranslationDraft = { description: null, notes: null, fabricInformation: null, shippingDelivery: null, returnPolicy: null };

export const LOCALES = ["EN", "ID"] as const;

/**
 * The four fields with a store-wide default (D9). Leaving one empty is not a gap —
 * it means "use the default", which is the whole point of the four-level fallback
 * chain, so the hints say so rather than nagging the admin to fill them in.
 */
const DEFAULTED_FIELDS = [
  { key: "notes", label: "Notes", hint: "Empty falls back to the store default (product_defaults.default_notes) — the made-to-order lead time." },
  { key: "fabricInformation", label: "Fabric information", hint: "Empty falls back to product_defaults.default_fabric_information." },
  { key: "shippingDelivery", label: "Shipping & delivery", hint: "Empty falls back to product_defaults.default_shipping_delivery." },
  { key: "returnPolicy", label: "Return policy", hint: "Empty falls back to product_defaults.default_return_policy." },
] as const;

/** True when the locale carries anything worth marking the tab for. */
export const hasContent = (draft: TranslationDraft) => Boolean(draft.description || draft.notes || draft.fabricInformation || draft.shippingDelivery || draft.returnPolicy);

interface ProductContentProps {
  drafts: Record<Locale, TranslationDraft>;
  activeLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onChange: (locale: Locale, patch: Partial<TranslationDraft>) => void;
}

export const ProductContent = ({ drafts, activeLocale, onLocaleChange, onChange }: ProductContentProps) => {
  const draft = drafts[activeLocale];
  const isEnglish = activeLocale === "EN";

  const setField = (key: keyof TranslationDraft) => (value: JSONContent | null) => onChange(activeLocale, { [key]: value as RichText | null });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleTabs locales={LOCALES} active={activeLocale} onChange={onLocaleChange} filled={{ EN: hasContent(drafts.EN), ID: hasContent(drafts.ID) }} />
        <p className="text-xs text-body/50">
          {isEnglish
            ? "Optional — leave it all empty and the product still publishes, using the store defaults."
            : "Optional. Any field left empty falls back to English, field by field (§B3.2)."}
        </p>
      </div>

      <RichTextField
        label={`Description (${activeLocale})`}
        hint="No store-wide default — an empty Indonesian description falls back to English and stops there."
        value={draft.description as JSONContent | null}
        onChange={setField("description")}
        placeholder="Describe the piece…"
      />

      {DEFAULTED_FIELDS.map((field) => (
        <RichTextField
          key={field.key}
          label={`${field.label} (${activeLocale})`}
          hint={field.hint}
          value={draft[field.key] as JSONContent | null}
          onChange={setField(field.key)}
          placeholder="Leave empty to use the store default"
        />
      ))}
    </div>
  );
};
