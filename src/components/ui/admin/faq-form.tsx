"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import type { JSONContent } from "@tiptap/react";

import { faqsApi } from "@/utils";

import { CreateFaq, Faq, FaqListResponse, Locale, RichText, UpdateFaq } from "@/types";

import { ApiResponse } from "@/types";

import { ErrorState, Field, FormActions, FormLayout, FormSection, LoadingState, LocaleTabs, PageHeader, RichTextField, TextInput, Toggle } from "./slicing";

const LIST_HREF = "/admin/dashboard/faqs";

const LOCALES = ["EN", "ID"] as const;

interface TranslationDraft {
  question: string;
  answer: RichText | null;
}

const EMPTY_TRANSLATION: TranslationDraft = { question: "", answer: null };

interface FormState {
  topic: string;
  isActive: boolean;
  translations: Record<Locale, TranslationDraft>;
}

const EMPTY: FormState = { topic: "", isActive: true, translations: { EN: { ...EMPTY_TRANSLATION }, ID: { ...EMPTY_TRANSLATION } } };

const hasContent = (draft: TranslationDraft) => Boolean(draft.question.trim() || draft.answer);

type FormErrors = Partial<Record<"topic" | "questionEN" | "answerEN" | "questionID" | "answerID", string>>;

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!form.topic.trim()) errors.topic = "A topic is required";
  if (!form.translations.EN.question.trim()) errors.questionEN = "An English question is required";
  if (!form.translations.EN.answer) errors.answerEN = "An English answer is required";

  // The schema requires both fields on every row it receives, so a half-filled
  // Indonesian row cannot be submitted. Clearing it is the other way out.
  if (hasContent(form.translations.ID)) {
    if (!form.translations.ID.question.trim()) errors.questionID = "Add an Indonesian question, or clear the Indonesian answer";
    if (!form.translations.ID.answer) errors.answerID = "Add an Indonesian answer, or clear the Indonesian question";
  }

  return errors;
};

export const FaqForm = ({ faqId }: { faqId?: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const isEdit = Boolean(faqId);

  const { data: listData } = faqsApi.useGetFaqs<FaqListResponse>({ key: ["faqs", "topics"], params: { limit: 1 } });
  const { data, isLoading, isError } = faqsApi.useGetFaq<ApiResponse<Faq>>({ key: ["faq", faqId], id: faqId ?? "", enabled: isEdit });

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [activeLocale, setActiveLocale] = React.useState<Locale>("EN");
  const [loadedId, setLoadedId] = React.useState<string | null>(null);

  // Seeded during render, once — an effect would re-run on every background refetch
  // and discard whatever the admin had typed.
  const record = data?.data;
  if (record && loadedId !== record.id) {
    setLoadedId(record.id);

    const translations: Record<Locale, TranslationDraft> = { EN: { ...EMPTY_TRANSLATION }, ID: { ...EMPTY_TRANSLATION } };
    for (const row of record.translations ?? []) {
      translations[row.locale] = { question: row.question ?? "", answer: row.answer ?? null };
    }

    setForm({ topic: record.topic, isActive: record.isActive, translations });
  }

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["faqs"] });
    router.push(LIST_HREF);
  };

  const createFaq = faqsApi.useCreateFaq({ onSuccess });
  const updateFaq = faqsApi.useUpdateFaq({ onSuccess });

  const isPending = createFaq.isPending || updateFaq.isPending;

  const clearError = (key: keyof FormErrors) => setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));

  const setTranslation = (locale: Locale, changes: Partial<TranslationDraft>) => {
    setForm((previous) => ({ ...previous, translations: { ...previous.translations, [locale]: { ...previous.translations[locale], ...changes } } }));
    if (locale === "EN") {
      clearError("questionEN");
      clearError("answerEN");
    } else {
      clearError("questionID");
      clearError("answerID");
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate(form);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Both question and answer errors live behind the locale tabs, so jumping there
      // is the only way the admin sees why the save was refused.
      if (found.questionEN || found.answerEN) setActiveLocale("EN");
      else if (found.questionID || found.answerID) setActiveLocale("ID");
      return;
    }

    const payload: CreateFaq = {
      topic: form.topic.trim(),
      isActive: form.isActive,
      translations: (["EN", "ID"] as const)
        .filter((locale) => locale === "EN" || hasContent(form.translations[locale]))
        .map((locale) => ({ locale, question: form.translations[locale].question.trim(), answer: form.translations[locale].answer as RichText })),
    };

    if (isEdit && faqId) updateFaq.mutate({ id: faqId, faq: payload as UpdateFaq });
    else createFaq.mutate(payload);
  };

  if (isEdit && isLoading) return <LoadingState message="Loading FAQ" />;
  if (isEdit && isError) return <ErrorState message="We couldn't load this FAQ." />;

  const topics = listData?.topics ?? [];
  const draft = form.translations[activeLocale];
  const isEnglish = activeLocale === "EN";

  return (
    <>
      <PageHeader
        narrow
        back={{ href: LIST_HREF, label: "FAQ" }}
        title={isEdit ? form.translations.EN.question || "Edit FAQ" : "New FAQ"}
        description="Grouped by topic so one component can serve several pages. English is required; Indonesian is optional."
      />

      <FormLayout onSubmit={handleSubmit}>
        <FormSection title="Details">
          <Field
            label="Topic"
            htmlFor="topic"
            required
            error={errors.topic}
            hint={topics.length > 0 ? `Reuse an existing topic where you can — ${topics.join(", ")}` : "The grouping key, e.g. shipping or sizing."}
          >
            {/* A datalist rather than a select: existing topics are suggested so the
                admin reuses them instead of creating a near-duplicate by typo, but a
                genuinely new topic still only takes typing it. */}
            <TextInput
              id="topic"
              list="faq-topics"
              value={form.topic}
              onChange={(event) => {
                setForm((previous) => ({ ...previous, topic: event.target.value }));
                clearError("topic");
              }}
              invalid={Boolean(errors.topic)}
              placeholder="shipping"
            />
            <datalist id="faq-topics">
              {topics.map((topic) => (
                <option key={topic} value={topic} />
              ))}
            </datalist>
          </Field>

          <Toggle
            id="isActive"
            label="Active"
            description="Inactive entries stay here but never appear on the public page."
            checked={form.isActive}
            onChange={(isActive) => setForm((previous) => ({ ...previous, isActive }))}
          />
        </FormSection>

        <FormSection title="Question & answer">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LocaleTabs locales={LOCALES} active={activeLocale} onChange={setActiveLocale} filled={{ EN: hasContent(form.translations.EN), ID: hasContent(form.translations.ID) }} />
            <p className="text-xs text-body/50">{isEnglish ? "Required — the question and answer live here." : "Optional. Leave both empty to show the English pair."}</p>
          </div>

          <Field label={`Question (${activeLocale})`} htmlFor={`question-${activeLocale}`} required={isEnglish} error={isEnglish ? errors.questionEN : errors.questionID}>
            <TextInput
              id={`question-${activeLocale}`}
              value={draft.question}
              onChange={(event) => setTranslation(activeLocale, { question: event.target.value })}
              invalid={Boolean(isEnglish ? errors.questionEN : errors.questionID)}
              placeholder={isEnglish ? "How long does delivery take?" : form.translations.EN.question || "Berapa lama pengiriman?"}
            />
          </Field>

          <RichTextField
            label={`Answer (${activeLocale})`}
            required={isEnglish}
            error={isEnglish ? errors.answerEN : errors.answerID}
            hint="Lists and links are available — most answers need at least one."
            value={draft.answer as JSONContent | null}
            onChange={(answer) => setTranslation(activeLocale, { answer: answer as RichText | null })}
            placeholder="Write the answer…"
          />
        </FormSection>

        <FormActions
          isPending={isPending}
          submitLabel={isEdit ? "Save changes" : "Create FAQ"}
          onCancel={() => router.push(LIST_HREF)}
          note={isEdit ? "Translations are replaced with what is on this form." : "New entries appear last within their topic."}
        />
      </FormLayout>
    </>
  );
};
