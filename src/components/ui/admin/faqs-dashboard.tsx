"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { PiCaretDown, PiQuestion } from "react-icons/pi";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { faqsApi } from "@/utils";

import { Faq, FaqListResponse } from "@/types";

import {
  AdminButton,
  AdminLinkButton,
  Badge,
  Chip,
  ConfirmDialog,
  DataPagination,
  EmptyState,
  ErrorState,
  FilterDropdown,
  FilterRow,
  ListToolbar,
  LoadingState,
  PageHeader,
  Panel,
  RowAction,
  RowActionLink,
  SearchBar,
  ToolbarRow,
} from "./slicing";

const ALL = { value: "", label: "All" };
const STATUS_OPTIONS = [ALL, { value: "true", label: "Active" }, { value: "false", label: "Inactive" }];

const FILTER_KEYS = ["topic", "isActive"] as const;

/**
 * Topics are stored lowercase so that "Shipping" and "shipping" cannot become two
 * groups. That makes them canonical but ugly to read, so every place the admin sees
 * one puts the capitals back — "shipping cost" reads as "Shipping Cost".
 */
const titleCase = (topic: string) => topic.replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Renders the stored Tiptap answer as plain text — enough for a one-line preview. */
const plainText = (node: unknown): string => {
  if (!node || typeof node !== "object") return "";
  const record = node as { text?: string; content?: unknown[] };
  if (typeof record.text === "string") return record.text;
  return (record.content ?? []).map(plainText).join(" ");
};

export const FaqsDashboard = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, page, limit, handlePageChange, filters, setFilter, resetAll, hasFilters } = useSearchPagination({
    filterKeys: FILTER_KEYS,
    defaultLimit: 25,
  });

  const [toDelete, setToDelete] = React.useState<Faq | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const { data, isLoading, isError, refetch } = faqsApi.useGetFaqs<FaqListResponse>({
    key: ["faqs", searchQuery, page, limit, filters.topic, filters.isActive],
    enabled: isAuthenticated,
    // `isActive` is only sent when the admin filters on it — an inactive entry the
    // admin cannot see is one they cannot bring back.
    params: { search: searchQuery, page, limit, topic: filters.topic, isActive: filters.isActive },
  });

  const deleteFaq = faqsApi.useDeleteFaq({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      setToDelete(null);
    },
  });

  const faqs = data?.data ?? [];
  const pagination = data?.pagination;
  const topicOptions = [ALL, ...(data?.topics ?? []).map((topic) => ({ value: topic, label: titleCase(topic) }))];

  // Grouped for display, but the server already sorted by topic then creation order —
  // this only inserts the headings.
  const groups = faqs.reduce<Record<string, Faq[]>>((accumulator, faq) => ({ ...accumulator, [faq.topic]: [...(accumulator[faq.topic] ?? []), faq] }), {});

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="FAQ"
        description="Questions and answers shown on your website. Give each one a topic so it appears on the right page. Within a topic they show in the order you added them."
        actions={<AdminLinkButton href="/admin/dashboard/faqs/create" variant="solid">New FAQ</AdminLinkButton>}
      />

      <ListToolbar>
        <SearchBar value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search question or topic…" />

        <ToolbarRow>
          <FilterRow>
            <FilterDropdown label="Topic" value={filters.topic} options={topicOptions} onChange={(value) => setFilter("topic", value)} />
            <FilterDropdown label="Status" value={filters.isActive} options={STATUS_OPTIONS} onChange={(value) => setFilter("isActive", value)} />
            {hasFilters && (
              <AdminButton size="sm" variant="ghost" onClick={resetAll}>
                Clear
              </AdminButton>
            )}
          </FilterRow>

          {pagination && (
            <p className="text-xs text-body/50">
              {pagination.total} entr{pagination.total === 1 ? "y" : "ies"} {hasFilters ? "matching your filters" : "total"}
            </p>
          )}
        </ToolbarRow>
      </ListToolbar>

      {isLoading ? (
        <LoadingState message="Loading FAQ" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : faqs.length === 0 ? (
        <EmptyState
          icon={<PiQuestion className="size-6" />}
          title={hasFilters ? "No entries match your filters" : "No FAQ entries yet"}
          description={hasFilters ? "Try a different keyword, or clear the filters." : "Start with the questions buyers actually ask."}
          action={hasFilters ? undefined : <AdminLinkButton href="/admin/dashboard/faqs/create" variant="solid">New FAQ</AdminLinkButton>}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([topic, entries]) => (
            <div key={topic}>
              <div className="flex items-baseline justify-between gap-4 pb-3 mb-3 border-b border-border">
                <h2 className="admin-section-label">{titleCase(topic)}</h2>
                <span className="text-xs text-body/45">
                  {entries.length} entr{entries.length === 1 ? "y" : "ies"}
                </span>
              </div>

              <Panel className="overflow-hidden divide-y divide-border/70">
                {entries.map((faq) => {
                  const locales = new Set((faq.translations ?? []).map((translation) => translation.locale));
                  const isOpen = expanded === faq.id;

                  return (
                    <div key={faq.id} className="px-5 py-4 duration-200 hover:bg-muted/40">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <button type="button" onClick={() => setExpanded(isOpen ? null : faq.id)} className="flex items-start flex-1 gap-3 min-w-64 text-left cursor-pointer group">
                          <PiCaretDown className={`mt-1 size-3.5 shrink-0 duration-200 text-body/35 ${isOpen ? "rotate-180" : ""}`} />
                          <span className="min-w-0">
                            <span className="block duration-200 text-body group-hover:text-primary">{faq.question ?? "(untitled)"}</span>
                            {!isOpen && <span className="block mt-0.5 text-xs truncate text-body/45">{plainText(faq.answer)}</span>}
                          </span>
                        </button>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="flex gap-2">
                            {(["EN", "ID"] as const).map((locale) => (
                              <Chip key={locale} muted={!locales.has(locale)}>
                                {locale}
                              </Chip>
                            ))}
                          </span>
                          {!faq.isActive && <Badge className="bg-body/6 text-body/50">Inactive</Badge>}
                          <RowActionLink href={`/admin/dashboard/faqs/${faq.id}/edit`}>Edit</RowActionLink>
                          <RowAction tone="danger" onClick={() => setToDelete(faq)}>
                            Delete
                          </RowAction>
                        </div>
                      </div>

                      {isOpen && <div className="pt-3 mt-3 ml-6 text-sm border-t border-border/70 text-body/70">{plainText(faq.answer) || "(no answer)"}</div>}
                    </div>
                  );
                })}
              </Panel>
            </div>
          ))}
        </div>
      )}

      {pagination && <DataPagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={handlePageChange} />}

      <ConfirmDialog
        isVisible={toDelete !== null}
        title={`Delete "${toDelete?.question ?? "this entry"}"?`}
        description="The entry and both its translations are removed permanently. Deactivate it instead if you only want it off the public page."
        confirmLabel="Delete FAQ"
        isPending={deleteFaq.isPending}
        onConfirm={() => toDelete && deleteFaq.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
