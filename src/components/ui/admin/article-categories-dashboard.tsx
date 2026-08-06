"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { PiTag } from "react-icons/pi";

import { articleCategoriesApi } from "@/utils";

import { ApiResponse, ArticleCategory, CreateArticleCategory, Locale } from "@/types";

import { AdminButton, Badge, ConfirmDialog, EmptyState, ErrorState, Field, LoadingState, LocaleTabs, PageHeader, Panel, RowAction, TableShell, Td, Th, TextArea, TextInput } from "./slicing";

const LOCALES = ["EN", "ID"] as const;

interface FormState {
  slug: string;
  isActive: boolean;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
}

const EMPTY: FormState = { slug: "", isActive: true, name: { EN: "", ID: "" }, description: { EN: "", ID: "" } };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Categories are a short, flat list with two fields, so the editor sits on the same
 * screen rather than on its own page — the same call the Sizes screen makes. Articles
 * get dedicated pages because their form carries an image and a Tiptap body.
 */
export const ArticleCategoriesDashboard = () => {
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [activeLocale, setActiveLocale] = React.useState<Locale>("EN");
  const [error, setError] = React.useState<string>("");
  const [toDelete, setToDelete] = React.useState<ArticleCategory | null>(null);
  const [isSlugTouched, setIsSlugTouched] = React.useState(false);

  const { data, isLoading, isError, refetch } = articleCategoriesApi.useGetArticleCategories<ApiResponse<ArticleCategory[]>>({ key: ["article-categories"] });

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
    setActiveLocale("EN");
    setIsSlugTouched(false);
    setError("");
  };

  const onSettled = () => {
    queryClient.invalidateQueries({ queryKey: ["article-categories"] });
    refetch();
    reset();
  };

  const createCategory = articleCategoriesApi.useCreateArticleCategory({ onSuccess: onSettled });
  const updateCategory = articleCategoriesApi.useUpdateArticleCategory({ onSuccess: onSettled });
  const deleteCategory = articleCategoriesApi.useDeleteArticleCategory({
    onSuccess: () => {
      refetch();
      setToDelete(null);
    },
  });

  const categories = data?.data ?? [];
  const isPending = createCategory.isPending || updateCategory.isPending;

  const setName = (locale: Locale, value: string) => {
    setForm((previous) => ({
      ...previous,
      name: { ...previous.name, [locale]: value },
      // The slug follows the English name until the admin edits it themselves.
      ...(locale === "EN" && !isSlugTouched && !editingId ? { slug: slugify(value) } : {}),
    }));
    setError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.EN.trim()) {
      setError("An English name is required — the name lives only in the translation");
      setActiveLocale("EN");
      return;
    }
    if (!form.slug.trim()) {
      setError("A slug is required");
      return;
    }

    const payload: CreateArticleCategory = {
      slug: form.slug.trim(),
      isActive: form.isActive,
      translations: [
        { locale: "EN", name: form.name.EN.trim(), description: form.description.EN.trim() || null },
        // Only sent when it carries something: an empty ID row would render as a
        // blank name instead of falling back to English.
        ...(form.name.ID.trim() ? [{ locale: "ID" as const, name: form.name.ID.trim(), description: form.description.ID.trim() || null }] : []),
      ],
    };

    if (editingId) updateCategory.mutate({ id: editingId, category: payload });
    else createCategory.mutate(payload);
  };

  const startEdit = (category: ArticleCategory) => {
    const name: Record<Locale, string> = { EN: "", ID: "" };
    const description: Record<Locale, string> = { EN: "", ID: "" };

    for (const translation of category.translations ?? []) {
      name[translation.locale] = translation.name ?? "";
      description[translation.locale] = translation.description ?? "";
    }

    setEditingId(category.id);
    setIsSlugTouched(true);
    setActiveLocale("EN");
    setError("");
    setForm({ slug: category.slug, isActive: category.isActive, name, description });
  };

  return (
    <>
      <PageHeader eyebrow="Content" title="Article Categories" description="How the Journal is grouped. The name lives in the translation, so an English one is always required — Indonesian falls back to it field by field." />

      <Panel className="p-5 mb-8 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <p className="admin-section-label">{editingId ? "Edit category" : "Add a category"}</p>
          <LocaleTabs locales={LOCALES} active={activeLocale} onChange={setActiveLocale} filled={{ EN: Boolean(form.name.EN.trim()), ID: Boolean(form.name.ID.trim()) }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-xs text-red-700">{error}</p>}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={`Name (${activeLocale})`} htmlFor={`name-${activeLocale}`} required={activeLocale === "EN"}>
              <TextInput
                id={`name-${activeLocale}`}
                value={form.name[activeLocale]}
                onChange={(event) => setName(activeLocale, event.target.value)}
                invalid={activeLocale === "EN" && Boolean(error)}
                placeholder={activeLocale === "EN" ? "Craft & Process" : form.name.EN || "Kriya & Proses"}
              />
            </Field>

            <Field label="Slug" htmlFor="slug" required hint="The public URL segment — one slug for both languages (D4)">
              <TextInput
                id="slug"
                value={form.slug}
                onChange={(event) => {
                  setIsSlugTouched(true);
                  setForm((previous) => ({ ...previous, slug: slugify(event.target.value) }));
                }}
                placeholder="craft-and-process"
              />
            </Field>
          </div>

          <Field label={`Description (${activeLocale})`} htmlFor={`description-${activeLocale}`} hint="Optional intro shown above the category's article list.">
            <TextArea
              id={`description-${activeLocale}`}
              rows={2}
              value={form.description[activeLocale]}
              onChange={(event) => setForm((previous) => ({ ...previous, description: { ...previous.description, [activeLocale]: event.target.value } }))}
            />
          </Field>

          <div className="flex flex-wrap items-end gap-5">
            {/* No order field: the Journal menu follows creation order. */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))} className="checkbox-form" />
              <span className="text-sm text-body/70">Active</span>
            </label>

            <div className="flex gap-2 pb-1 ml-auto">
              <AdminButton type="submit" variant="solid" disabled={isPending}>
                {isPending ? "Saving…" : editingId ? "Update" : "Add category"}
              </AdminButton>
              {editingId && (
                <AdminButton type="button" onClick={reset}>
                  Cancel
                </AdminButton>
              )}
            </div>
          </div>
        </form>
      </Panel>

      {isLoading ? (
        <LoadingState message="Loading categories" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : categories.length === 0 ? (
        <EmptyState icon={<PiTag className="size-6" />} title="No categories yet" description="Every article belongs to a category, so start with one." />
      ) : (
        <Panel className="overflow-hidden">
          <TableShell>
            <thead className="border-b bg-muted/60 border-border">
              <tr>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Locales</Th>
                <Th className="text-right">Articles</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {categories.map((category) => {
                const locales = new Set((category.translations ?? []).map((translation) => translation.locale));

                return (
                  <tr key={category.id} className="duration-200 hover:bg-muted/40">
                    <Td className="text-body">{category.name ?? "(untitled)"}</Td>
                    <Td className="font-mono text-xs text-body/50">{category.slug}</Td>
                    <Td>
                      <span className="flex gap-2">
                        {LOCALES.map((locale) => (
                          <span key={locale} className={`font-heading text-xxs font-semibold uppercase tracking-[0.14em] ${locales.has(locale) ? "text-primary" : "text-body/25"}`}>
                            {locale}
                          </span>
                        ))}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">{category.articleCount ?? 0}</Td>
                    <Td>
                      <Badge className={category.isActive ? "bg-primary/12 text-primary" : "bg-body/6 text-body/50"}>{category.isActive ? "Active" : "Inactive"}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-4">
                        <RowAction onClick={() => startEdit(category)}>Edit</RowAction>
                        <RowAction tone="danger" onClick={() => setToDelete(category)}>
                          Delete
                        </RowAction>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </Panel>
      )}

      <ConfirmDialog
        isVisible={Boolean(toDelete)}
        title={`Delete "${toDelete?.name ?? "this category"}"?`}
        description={
          (toDelete?.articleCount ?? 0) > 0
            ? `This category still has ${toDelete?.articleCount} article(s). Article.categoryId is required, so the server will refuse — move them elsewhere first, or deactivate this category instead.`
            : "It will be permanently removed, along with its translations."
        }
        confirmLabel="Delete category"
        isPending={deleteCategory.isPending}
        onConfirm={() => toDelete && deleteCategory.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
