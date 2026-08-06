"use client";

import * as React from "react";

import type { JSONContent } from "@tiptap/react";

import { Locale, RichText } from "@/types";

import { Field, LocaleTabs, RichTextField, TextInput } from "./form";

export interface TranslationDraft {
  name: string;
  description: RichText | null;
  notes: RichText | null;
  fabricInformation: RichText | null;
  shippingDelivery: RichText | null;
  returnPolicy: RichText | null;
}

export const EMPTY_TRANSLATION: TranslationDraft = { name: "", description: null, notes: null, fabricInformation: null, shippingDelivery: null, returnPolicy: null };

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
export const hasContent = (draft: TranslationDraft) => Boolean(draft.name.trim() || draft.description || draft.notes || draft.fabricInformation || draft.shippingDelivery || draft.returnPolicy);

interface ProductContentProps {
  drafts: Record<Locale, TranslationDraft>;
  activeLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onChange: (locale: Locale, patch: Partial<TranslationDraft>) => void;
  nameError?: string;
}

export const ProductContent = ({ drafts, activeLocale, onLocaleChange, onChange, nameError }: ProductContentProps) => {
  const draft = drafts[activeLocale];
  const isEnglish = activeLocale === "EN";

  const setField = (key: keyof TranslationDraft) => (value: JSONContent | null) => onChange(activeLocale, { [key]: value as RichText | null });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LocaleTabs locales={LOCALES} active={activeLocale} onChange={onLocaleChange} filled={{ EN: hasContent(drafts.EN), ID: hasContent(drafts.ID) }} />
        <p className="text-xs text-body/50">
          {isEnglish ? "English is required — it is the fallback for every field." : "Indonesian is optional. Any field left empty falls back to English, field by field (§B3.2)."}
        </p>
      </div>

      <Field
        label={`Product name (${activeLocale})`}
        htmlFor={`name-${activeLocale}`}
        required={isEnglish}
        error={isEnglish ? nameError : undefined}
        hint={isEnglish ? "Product has no name column — this is where the name lives." : "Leave empty to show the English name to Indonesian visitors."}
      >
        <TextInput
          id={`name-${activeLocale}`}
          value={draft.name}
          onChange={(event) => onChange(activeLocale, { name: event.target.value })}
          invalid={isEnglish && Boolean(nameError)}
          placeholder={isEnglish ? "Cotton Day Dress" : drafts.EN.name || "Gaun Katun Harian"}
        />
      </Field>

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
