"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { PiPlus, PiTrash, PiWarningCircle } from "react-icons/pi";

import { sizeGuidesApi, sizesApi } from "@/utils";

import { ApiResponse, CreateSizeGuide, Locale, Size, SizeGuide, UpdateSizeGuide } from "@/types";

import { AdminButton, CheckboxItem, ErrorState, Field, FieldRow, FormActions, FormLayout, FormSection, LoadingState, LocaleTabs, PageHeader, TextArea, TextInput, Toggle } from "./slicing";

const LIST_HREF = "/admin/dashboard/size-guides";

const LOCALES = ["EN", "ID"] as const;

/** One measurement column: a stable key plus its per-locale display label. */
interface ParameterDraft {
  key: string;
  labels: Record<Locale, string>;
}

interface FormState {
  order: string;
  isPublished: boolean;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  parameters: ParameterDraft[];
  sizeIds: string[];
  /** sizeId → parameter key → raw input value. Strings, so a half-typed number survives. */
  values: Record<string, Record<string, string>>;
}

const EMPTY: FormState = {
  order: "0",
  isPublished: false,
  title: { EN: "", ID: "" },
  description: { EN: "", ID: "" },
  parameters: [{ key: "bust", labels: { EN: "Bust (cm)", ID: "" } }],
  sizeIds: [],
  values: {},
};

/** Measurement keys are identifiers, not display text — they never get translated. */
const toKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

type FormErrors = Partial<Record<"title" | "parameters" | "sizes", string>>;

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!form.title.EN.trim()) errors.title = "An English title is required";

  const keys = form.parameters.map((parameter) => parameter.key.trim()).filter(Boolean);
  if (keys.length === 0) errors.parameters = "Add at least one measurement";
  else if (new Set(keys).size !== keys.length) errors.parameters = "Measurement keys must be unique";
  else if (form.parameters.some((parameter) => !parameter.labels.EN.trim())) errors.parameters = "Every measurement needs an English label";

  if (form.sizeIds.length === 0) errors.sizes = "Select at least one size";

  return errors;
};

export const SizeGuideForm = ({ guideId, duplicateFromId }: { guideId?: string; duplicateFromId?: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const isEdit = Boolean(guideId);
  const sourceId = guideId ?? duplicateFromId;

  const { data: sizesData } = sizesApi.useGetSizes<ApiResponse<Size[]>>({ key: ["sizes", "active"], params: { isActive: true } });
  const { data, isLoading, isError } = sizeGuidesApi.useGetSizeGuide<ApiResponse<SizeGuide>>({ key: ["size-guide", sourceId], id: sourceId ?? "", enabled: Boolean(sourceId) });

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [activeLocale, setActiveLocale] = React.useState<Locale>("EN");
  const [loadedId, setLoadedId] = React.useState<string | null>(null);

  const sizes = React.useMemo(() => [...(sizesData?.data ?? [])].sort((a, b) => a.order - b.order), [sizesData]);

  // Seeded during render, once — an effect would re-run on every background refetch
  // and throw away whatever the admin had typed.
  const record = data?.data;
  if (record && loadedId !== record.id) {
    setLoadedId(record.id);

    const title: Record<Locale, string> = { EN: "", ID: "" };
    const description: Record<Locale, string> = { EN: "", ID: "" };
    const labels: Record<Locale, Record<string, string>> = { EN: {}, ID: {} };

    for (const translation of record.translations ?? []) {
      title[translation.locale] = translation.title ?? "";
      description[translation.locale] = translation.description ?? "";
      labels[translation.locale] = translation.parameterLabels ?? {};
    }

    // The columns are whatever the first row actually measures — the labels map may
    // be missing keys, so the rows are the authority on which columns exist.
    const keys = Object.keys(record.rows[0]?.measurements ?? {});

    const values: FormState["values"] = {};
    for (const row of record.rows) {
      values[row.sizeId] = Object.fromEntries(keys.map((key) => [key, String(row.measurements[key] ?? "")]));
    }

    setForm({
      order: String(record.order ?? 0),
      // A duplicate always starts as a draft: publishing a copy the moment it is
      // created would put an unedited twin on the public page.
      isPublished: isEdit ? Boolean(record.publishedAt) : false,
      title: isEdit ? title : { EN: `${title.EN} (copy)`, ID: title.ID ? `${title.ID} (salinan)` : "" },
      description,
      parameters: keys.map((key) => ({ key, labels: { EN: labels.EN[key] ?? key, ID: labels.ID[key] ?? "" } })),
      sizeIds: record.rows.map((row) => row.sizeId),
      values,
    });
  }

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["size-guides"] });
    router.push(LIST_HREF);
  };

  const createGuide = sizeGuidesApi.useCreateSizeGuide({ onSuccess });
  const updateGuide = sizeGuidesApi.useUpdateSizeGuide({ onSuccess });

  const isPending = createGuide.isPending || updateGuide.isPending;

  const patch = (changes: Partial<FormState>) => setForm((previous) => ({ ...previous, ...changes }));

  const setParameter = (index: number, changes: Partial<ParameterDraft>) => {
    setForm((previous) => ({ ...previous, parameters: previous.parameters.map((parameter, position) => (position === index ? { ...parameter, ...changes } : parameter)) }));
    setErrors((previous) => ({ ...previous, parameters: undefined }));
  };

  const addParameter = () => patch({ parameters: [...form.parameters, { key: "", labels: { EN: "", ID: "" } }] });

  const removeParameter = (index: number) => patch({ parameters: form.parameters.filter((_, position) => position !== index) });

  const toggleSize = (sizeId: string, enabled: boolean) => {
    patch({ sizeIds: enabled ? [...form.sizeIds, sizeId] : form.sizeIds.filter((id) => id !== sizeId) });
    setErrors((previous) => ({ ...previous, sizes: undefined }));
  };

  const setValue = (sizeId: string, key: string, value: string) =>
    setForm((previous) => ({ ...previous, values: { ...previous.values, [sizeId]: { ...previous.values[sizeId], [key]: value } } }));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      if (found.title) setActiveLocale("EN");
      return;
    }

    const keys = form.parameters.map((parameter) => parameter.key.trim());

    // Rows follow size.order, not selection order — SizeGuideRow has no order column
    // of its own precisely so there is one ordering source (D21).
    const orderedSizeIds = sizes.filter((size) => form.sizeIds.includes(size.id)).map((size) => size.id);

    const payload: CreateSizeGuide = {
      order: Number(form.order) || 0,
      publishedAt: form.isPublished ? new Date().toISOString() : null,
      rows: orderedSizeIds.map((sizeId) => ({
        sizeId,
        measurements: Object.fromEntries(keys.map((key) => [key, Number(form.values[sizeId]?.[key] ?? 0) || 0])),
      })),
      translations: [
        {
          locale: "EN",
          title: form.title.EN.trim(),
          description: form.description.EN.trim() || null,
          parameterLabels: Object.fromEntries(form.parameters.map((parameter) => [parameter.key.trim(), parameter.labels.EN.trim()])),
        },
        // The Indonesian row only goes out when it carries something — an all-empty
        // row would render as blank headings rather than falling back to English.
        ...(form.title.ID.trim() || form.parameters.some((parameter) => parameter.labels.ID.trim())
          ? [
              {
                locale: "ID" as const,
                title: form.title.ID.trim() || form.title.EN.trim(),
                description: form.description.ID.trim() || null,
                parameterLabels: Object.fromEntries(form.parameters.filter((parameter) => parameter.labels.ID.trim()).map((parameter) => [parameter.key.trim(), parameter.labels.ID.trim()])),
              },
            ]
          : []),
      ],
    };

    if (isEdit && guideId) updateGuide.mutate({ id: guideId, guide: payload as UpdateSizeGuide });
    else createGuide.mutate(payload);
  };

  if (sourceId && isLoading) return <LoadingState message="Loading size guide" />;
  if (sourceId && isError) return <ErrorState message="We couldn't load this size guide." />;

  const selectedSizes = sizes.filter((size) => form.sizeIds.includes(size.id));
  const columns = form.parameters.filter((parameter) => parameter.key.trim());

  return (
    <>
      <PageHeader
        back={{ href: LIST_HREF, label: "Size Guides" }}
        title={isEdit ? form.title.EN || "Edit size guide" : duplicateFromId ? "Duplicate size guide" : "New size guide"}
        description="Body measurements for a pattern, shared by every product that uses this guide. Packing dimensions are not here — those belong to the individual product (D6)."
      />

      <FormLayout onSubmit={handleSubmit}>
        <FormSection title="Details">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LocaleTabs locales={LOCALES} active={activeLocale} onChange={setActiveLocale} filled={{ EN: Boolean(form.title.EN.trim()), ID: Boolean(form.title.ID.trim()) }} />
            <p className="text-xs text-body/50">{activeLocale === "EN" ? "Required — the fallback for both fields." : "Optional. Empty falls back to English, field by field."}</p>
          </div>

          <Field
            label={`Title (${activeLocale})`}
            htmlFor={`title-${activeLocale}`}
            required={activeLocale === "EN"}
            error={activeLocale === "EN" ? errors.title : undefined}
            hint="The public page is a flat list, so the title carries the grouping — e.g. “Women — Batik” (D1)."
          >
            <TextInput
              id={`title-${activeLocale}`}
              value={form.title[activeLocale]}
              onChange={(event) => {
                patch({ title: { ...form.title, [activeLocale]: event.target.value } });
                setErrors((previous) => ({ ...previous, title: undefined }));
              }}
              invalid={activeLocale === "EN" && Boolean(errors.title)}
              placeholder={activeLocale === "EN" ? "Women — Batik" : form.title.EN || "Wanita — Batik"}
            />
          </Field>

          <Field label={`Description (${activeLocale})`} htmlFor={`description-${activeLocale}`}>
            <TextArea
              id={`description-${activeLocale}`}
              rows={3}
              value={form.description[activeLocale]}
              onChange={(event) => patch({ description: { ...form.description, [activeLocale]: event.target.value } })}
              placeholder="For batik skirts and wrapped lower garments."
            />
          </Field>

          <FieldRow>
            <Field label="Order" htmlFor="order" hint="Position on the public Size Guide page">
              <TextInput id="order" type="number" value={form.order} onChange={(event) => patch({ order: event.target.value })} />
            </Field>

            <div className="sm:pt-6">
              <Toggle
                id="isPublished"
                label="Published"
                description="Draft guides are still assignable to products; only published ones appear on the public page (D1)."
                checked={form.isPublished}
                onChange={(isPublished) => patch({ isPublished })}
              />
            </div>
          </FieldRow>
        </FormSection>

        <FormSection
          title="Measurements"
          description="The columns of the table. The key is a stable identifier and is never shown to buyers — the labels are what they read, per language."
          aside={
            <AdminButton type="button" size="sm" onClick={addParameter}>
              <PiPlus className="size-3" />
              Add
            </AdminButton>
          }
        >
          {errors.parameters && <p className="text-xs text-red-700">{errors.parameters}</p>}

          <div className="space-y-3">
            {form.parameters.map((parameter, index) => (
              <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_10rem_auto]">
                <label className="block">
                  <span className="block mb-1 admin-field-label">English label</span>
                  <TextInput
                    value={parameter.labels.EN}
                    onChange={(event) => {
                      const label = event.target.value;
                      // The key follows the English label until it is edited by hand,
                      // so an admin never has to think about identifiers.
                      setParameter(index, { labels: { ...parameter.labels, EN: label }, ...(parameter.key === toKey(parameter.labels.EN) || !parameter.key ? { key: toKey(label) } : {}) });
                    }}
                    placeholder="Waist (cm)"
                  />
                </label>

                <label className="block">
                  <span className="block mb-1 admin-field-label">Indonesian label</span>
                  <TextInput value={parameter.labels.ID} onChange={(event) => setParameter(index, { labels: { ...parameter.labels, ID: event.target.value } })} placeholder="Lingkar Pinggang (cm)" />
                </label>

                <label className="block">
                  <span className="block mb-1 admin-field-label">Key</span>
                  <TextInput value={parameter.key} onChange={(event) => setParameter(index, { key: toKey(event.target.value) })} className="font-mono text-xs" placeholder="waist" />
                </label>

                <button
                  type="button"
                  onClick={() => removeParameter(index)}
                  disabled={form.parameters.length === 1}
                  aria-label="Remove measurement"
                  className="grid mb-1 rounded-sm cursor-pointer size-10 place-items-center text-body/40 hover:text-red-700 disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <PiTrash className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title="Sizes" description="Which sizes this guide covers. Rows are always ordered by the size order set on the Sizes page (D21).">
          {errors.sizes && <p className="text-xs text-red-700">{errors.sizes}</p>}

          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {sizes.map((size) => (
              <CheckboxItem key={size.id} id={`size-${size.id}`} label={size.code} description={size.label} checked={form.sizeIds.includes(size.id)} onChange={(checked) => toggleSize(size.id, checked)} />
            ))}
          </div>

          {selectedSizes.length > 0 && columns.length > 0 && (
            <div className="mt-6 overflow-x-auto border rounded-sm scrollbar border-border">
              <table className="w-full min-w-max">
                <thead className="border-b bg-muted/60 border-border">
                  <tr>
                    <th className="px-4 py-3 font-heading text-xxs font-semibold tracking-[0.14em] text-left uppercase text-body/50">Size</th>
                    {columns.map((parameter) => (
                      <th key={parameter.key} className="px-4 py-3 font-heading text-xxs font-semibold tracking-[0.14em] text-left uppercase text-body/50">
                        {parameter.labels.EN || parameter.key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {selectedSizes.map((size) => (
                    <tr key={size.id}>
                      <td className="px-4 py-2 font-mono text-sm text-body">{size.code}</td>
                      {columns.map((parameter) => (
                        <td key={parameter.key} className="px-4 py-2">
                          <TextInput
                            type="number"
                            min={0}
                            step="any"
                            value={form.values[size.id]?.[parameter.key] ?? ""}
                            onChange={(event) => setValue(size.id, parameter.key, event.target.value)}
                            aria-label={`${parameter.labels.EN || parameter.key} for ${size.code}`}
                            className="w-28 py-1.5"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedSizes.length > 0 && columns.length === 0 && (
            <p className="flex items-center gap-1.5 mt-4 text-xs text-amber-700">
              <PiWarningCircle className="size-3.5 shrink-0" />
              Add a measurement above before filling the table.
            </p>
          )}
        </FormSection>

        <FormActions
          isPending={isPending}
          submitLabel={isEdit ? "Save changes" : "Create size guide"}
          onCancel={() => router.push(LIST_HREF)}
          note={isEdit ? "Rows and translations are replaced with what is on this form." : undefined}
        />
      </FormLayout>
    </>
  );
};
