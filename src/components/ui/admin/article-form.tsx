"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import type { JSONContent } from "@tiptap/react";

import { useAuthStore } from "@/hooks";

import { articleCategoriesApi, articlesApi, convertDate } from "@/utils";

import { ApiResponse, Article, ArticleCategory, CreateArticle, Files, Locale, RichText, UpdateArticle } from "@/types";

import {
  ErrorState,
  Field,
  FieldRow,
  FormActions,
  FormLayout,
  FormSection,
  LoadingState,
  LocaleTabs,
  PageHeader,
  RichTextField,
  SelectInput,
  SingleImageField,
  TextArea,
  TextInput,
  Toggle,
} from "./slicing";

const LIST_HREF = "/admin/dashboard/articles";

const LOCALES = ["EN", "ID"] as const;

interface TranslationDraft {
  title: string;
  excerpt: string;
  content: RichText | null;
}

const EMPTY_TRANSLATION: TranslationDraft = { title: "", excerpt: "", content: null };

interface FormState {
  slug: string;
  categoryId: string;
  image: Files | null;
  imageAlt: string;
  featured: boolean;
  isPublished: boolean;
  translations: Record<Locale, TranslationDraft>;
}

const EMPTY: FormState = {
  slug: "",
  categoryId: "",
  image: null,
  imageAlt: "",
  featured: false,
  isPublished: false,
  translations: { EN: { ...EMPTY_TRANSLATION }, ID: { ...EMPTY_TRANSLATION } },
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** An ID row is worth sending only when it carries something of its own. */
const hasContent = (draft: TranslationDraft) => Boolean(draft.title.trim() || draft.excerpt.trim() || draft.content);

type FormErrors = Partial<Record<"slug" | "categoryId" | "image" | "titleEN" | "contentEN" | "titleID", string>>;

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!form.slug.trim()) errors.slug = "Slug is required";
  if (!form.categoryId) errors.categoryId = "Pick a category";
  if (!form.image) errors.image = "A cover image is required";

  // Title and content live in the translation, so unlike a product there is no column
  // to fall back on — an article without an EN row is unreadable in English.
  if (!form.translations.EN.title.trim()) errors.titleEN = "An English title is required";
  if (!form.translations.EN.content) errors.contentEN = "English content is required";

  // The schema requires a title on every row it receives, so a half-filled Indonesian
  // row cannot be submitted. Clearing it is the other way out.
  if (hasContent(form.translations.ID) && !form.translations.ID.title.trim()) errors.titleID = "Add an Indonesian title, or clear the other Indonesian fields";

  return errors;
};

export const ArticleForm = ({ articleId }: { articleId?: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isEdit = Boolean(articleId);

  const { data: categoriesData } = articleCategoriesApi.useGetArticleCategories<ApiResponse<ArticleCategory[]>>({ key: ["article-categories"] });
  const { data, isLoading, isError } = articlesApi.useGetArticle<ApiResponse<Article>>({ key: ["article", articleId], id: articleId ?? "", enabled: isEdit });

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [activeLocale, setActiveLocale] = React.useState<Locale>("EN");
  const [isSlugTouched, setIsSlugTouched] = React.useState(false);
  const [loadedId, setLoadedId] = React.useState<string | null>(null);
  const [publishedAt, setPublishedAt] = React.useState<string | null>(null);

  // Seeded during render, once — an effect would re-run on every background refetch
  // and discard whatever the admin had typed.
  const record = data?.data;
  if (record && loadedId !== record.id) {
    setLoadedId(record.id);
    setIsSlugTouched(true);
    setPublishedAt(record.publishedAt);

    const translations: Record<Locale, TranslationDraft> = { EN: { ...EMPTY_TRANSLATION }, ID: { ...EMPTY_TRANSLATION } };
    for (const row of record.translations ?? []) {
      translations[row.locale] = { title: row.title ?? "", excerpt: row.excerpt ?? "", content: row.content ?? null };
    }

    setForm({
      slug: record.slug,
      categoryId: record.categoryId,
      image: record.image ?? null,
      imageAlt: record.imageAlt ?? "",
      featured: record.featured,
      isPublished: Boolean(record.publishedAt),
      translations,
    });
  }

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["articles"] });
    queryClient.invalidateQueries({ queryKey: ["article-categories"] });
    router.push(LIST_HREF);
  };

  const createArticle = articlesApi.useCreateArticle({ onSuccess });
  const updateArticle = articlesApi.useUpdateArticle({ onSuccess });

  const isPending = createArticle.isPending || updateArticle.isPending;

  const patch = (changes: Partial<FormState>) => setForm((previous) => ({ ...previous, ...changes }));
  const clearError = (key: keyof FormErrors) => setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));

  const setTranslation = (locale: Locale, changes: Partial<TranslationDraft>) => {
    setForm((previous) => {
      const next = { ...previous, translations: { ...previous.translations, [locale]: { ...previous.translations[locale], ...changes } } };
      // The slug follows the English title until the admin edits the slug themselves.
      if (locale === "EN" && changes.title !== undefined && !isSlugTouched && !isEdit) next.slug = slugify(changes.title);
      return next;
    });
    if (locale === "EN") {
      clearError("titleEN");
      clearError("contentEN");
    } else clearError("titleID");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate(form);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // The title and content errors sit behind the locale tabs, so jumping there is
      // the only way the admin sees why the save was refused.
      if (found.titleEN || found.contentEN) setActiveLocale("EN");
      else if (found.titleID) setActiveLocale("ID");
      return;
    }

    const translations = (["EN", "ID"] as const)
      .filter((locale) => locale === "EN" || hasContent(form.translations[locale]))
      .map((locale) => ({
        locale,
        title: form.translations[locale].title.trim(),
        excerpt: form.translations[locale].excerpt.trim() || null,
        content: (form.translations[locale].content ?? form.translations.EN.content) as RichText,
      }));

    const payload: CreateArticle = {
      slug: form.slug.trim(),
      categoryId: form.categoryId,
      // Stamped on create only, so an edit by a different admin does not silently
      // reassign authorship.
      authorId: isEdit ? undefined : (user?.id ?? null),
      image: form.image as Files,
      imageAlt: form.imageAlt.trim() || null,
      featured: form.featured,
      // Publishing keeps the original date rather than resetting it, so re-saving a
      // published article does not push it back to the top of the Journal.
      publishedAt: form.isPublished ? (publishedAt ?? new Date().toISOString()) : null,
      translations,
    };

    if (isEdit && articleId) updateArticle.mutate({ id: articleId, article: payload as UpdateArticle });
    else createArticle.mutate(payload);
  };

  if (isEdit && isLoading) return <LoadingState message="Loading article" />;
  if (isEdit && isError) return <ErrorState message="We couldn't load this article." />;

  const categories = categoriesData?.data ?? [];
  const draft = form.translations[activeLocale];
  const isEnglish = activeLocale === "EN";

  return (
    <>
      <PageHeader
        narrow
        back={{ href: LIST_HREF, label: "Articles" }}
        title={isEdit ? form.translations.EN.title || "Edit article" : "New article"}
        description="English is required; Indonesian is optional and falls back to English field by field."
      />

      <FormLayout onSubmit={handleSubmit}>
        <FormSection title="Details">
          <FieldRow>
            <Field label="Category" htmlFor="categoryId" required error={errors.categoryId}>
              <SelectInput
                id="categoryId"
                value={form.categoryId}
                onChange={(event) => {
                  patch({ categoryId: event.target.value });
                  clearError("categoryId");
                }}
                invalid={Boolean(errors.categoryId)}
                placeholder={categories.length === 0 ? "No categories yet — create one first" : "Select category"}
                options={categories.map((category) => ({ value: category.id, label: category.isActive ? (category.name ?? category.slug) : `${category.name ?? category.slug} — inactive` }))}
              />
            </Field>

            <Field label="Slug" htmlFor="slug" required error={errors.slug} hint="The public URL — one slug for both languages (D4)">
              <TextInput
                id="slug"
                value={form.slug}
                onChange={(event) => {
                  setIsSlugTouched(true);
                  patch({ slug: slugify(event.target.value) });
                  clearError("slug");
                }}
                invalid={Boolean(errors.slug)}
                placeholder="how-our-batik-is-made"
              />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title="Cover image">
          <SingleImageField
            id="article-image"
            label="Image"
            required
            error={errors.image}
            hint="Shown on the Journal listing and at the top of the article."
            value={form.image}
            onChange={(image) => {
              patch({ image });
              clearError("image");
            }}
          />

          <Field label="Alt text" htmlFor="imageAlt" hint="Describes the image for screen readers and when it fails to load. Not translated.">
            <TextInput id="imageAlt" value={form.imageAlt} onChange={(event) => patch({ imageAlt: event.target.value })} placeholder="An artisan drawing batik with a canting" />
          </Field>
        </FormSection>

        <FormSection title="Content">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LocaleTabs
              locales={LOCALES}
              active={activeLocale}
              onChange={setActiveLocale}
              filled={{ EN: hasContent(form.translations.EN), ID: hasContent(form.translations.ID) }}
            />
            <p className="text-xs text-body/50">{isEnglish ? "Required — the title and body live here, not on the article." : "Optional. Leave a field empty to fall back to English."}</p>
          </div>

          <Field label={`Title (${activeLocale})`} htmlFor={`title-${activeLocale}`} required={isEnglish} error={isEnglish ? errors.titleEN : errors.titleID}>
            <TextInput
              id={`title-${activeLocale}`}
              value={draft.title}
              onChange={(event) => setTranslation(activeLocale, { title: event.target.value })}
              invalid={Boolean(isEnglish ? errors.titleEN : errors.titleID)}
              placeholder={isEnglish ? "How our batik is made" : form.translations.EN.title || "Bagaimana batik kami dibuat"}
            />
          </Field>

          <Field label={`Excerpt (${activeLocale})`} htmlFor={`excerpt-${activeLocale}`} hint="A short summary for the Journal listing.">
            <TextArea id={`excerpt-${activeLocale}`} rows={3} value={draft.excerpt} onChange={(event) => setTranslation(activeLocale, { excerpt: event.target.value })} />
          </Field>

          <RichTextField
            label={`Body (${activeLocale})`}
            required={isEnglish}
            error={isEnglish ? errors.contentEN : undefined}
            hint={isEnglish ? undefined : "Empty means the English body is shown to Indonesian readers."}
            value={draft.content as JSONContent | null}
            onChange={(content) => setTranslation(activeLocale, { content: content as RichText | null })}
            placeholder="Write the article…"
          />
        </FormSection>

        <FormSection title="Publishing">
          <div>
            <Toggle
              id="isPublished"
              label="Published"
              description={publishedAt ? `Live since ${convertDate(publishedAt)}. Unpublishing keeps the date for when it goes back up.` : "Drafts are visible here only — never on the Journal."}
              checked={form.isPublished}
              onChange={(isPublished) => patch({ isPublished })}
            />
            <Toggle id="featured" label="Featured" description="Surfaces this article at the top of the Journal." checked={form.featured} onChange={(featured) => patch({ featured })} />
          </div>
        </FormSection>

        <FormActions
          isPending={isPending}
          submitLabel={isEdit ? "Save changes" : "Create article"}
          onCancel={() => router.push(LIST_HREF)}
          note={isEdit ? "Translations are replaced with what is on this form." : "The image moves out of temp storage when you save."}
        />
      </FormLayout>
    </>
  );
};
