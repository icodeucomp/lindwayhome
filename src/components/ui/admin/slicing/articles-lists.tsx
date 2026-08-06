"use client";

import { PiNewspaper } from "react-icons/pi";

import { Img } from "@/components";

import type { ViewMode } from "@/hooks";

import { convertDate } from "@/utils";

import { Article } from "@/types";

import { Badge, Chip, EmptyState, ErrorState, LoadingState, Panel, RowAction, RowActionLink, TableShell, Td, Th } from "./ui";

interface ArticlesListsProps {
  articles: Article[];
  view: ViewMode;
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onDelete: (article: Article) => void;
}

const editHref = (article: Article) => `/admin/dashboard/articles/${article.id}/edit`;

const StatusBadge = ({ article }: { article: Article }) =>
  article.publishedAt ? <Badge className="bg-emerald-500/15 text-emerald-700">Published</Badge> : <Badge className="bg-body/6 text-body/50">Draft</Badge>;

const Marks = ({ article }: { article: Article }) => {
  const locales = new Set((article.translations ?? []).map((translation) => translation.locale));

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Chip muted={!locales.has("EN")}>EN</Chip>
      <Chip muted={!locales.has("ID")}>ID</Chip>
      {article.featured && <Chip>Featured</Chip>}
    </span>
  );
};

export const ArticlesLists = ({ articles, view, isLoading, isError, hasFilters, onDelete }: ArticlesListsProps) => {
  if (isLoading) return <LoadingState message="Loading articles" />;
  if (isError) return <ErrorState message="We couldn't load the journal. Please check your connection and try again." />;

  if (articles.length === 0) {
    return (
      <EmptyState
        icon={<PiNewspaper className="size-6" />}
        title={hasFilters ? "No articles match your filters" : "No articles yet"}
        description={hasFilters ? "Try a different keyword, or clear the filters to see every article including drafts." : "Write the first Journal entry."}
      />
    );
  }

  if (view === "grid") {
    return (
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <article key={article.id} className="flex flex-col">
            <div className="relative overflow-hidden border rounded-sm border-border bg-muted">
              {article.image?.url ? (
                <Img src={article.image.url} alt={article.imageAlt || article.title || article.slug} className="w-full aspect-16/10" cover />
              ) : (
                <div className="grid w-full aspect-16/10 place-items-center text-body/25">
                  <PiNewspaper className="size-8" />
                </div>
              )}
              <span className="absolute top-3 left-3">
                <StatusBadge article={article} />
              </span>
            </div>

            <h3 className="mt-3 text-lg font-normal font-heading text-body line-clamp-2">{article.title ?? "(untitled)"}</h3>
            <div className="mt-1">
              <Marks article={article} />
            </div>
            <p className="mt-1 text-sm text-body/60">{article.category?.name ?? "—"}</p>
            {article.excerpt && <p className="mt-2 text-sm text-body/50 line-clamp-2">{article.excerpt}</p>}

            <p className="mt-2 text-xs text-body/40">{article.publishedAt ? convertDate(article.publishedAt) : `Created ${convertDate(article.createdAt)}`}</p>

            <div className="flex items-center justify-end gap-4 pt-3 mt-auto border-t border-border">
              <RowActionLink href={editHref(article)}>Edit</RowActionLink>
              <RowAction tone="danger" onClick={() => onDelete(article)}>
                Delete
              </RowAction>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <TableShell>
        <thead className="border-b bg-muted/60 border-border">
          <tr>
            <Th>Article</Th>
            <Th>Category</Th>
            <Th>Author</Th>
            <Th>Status</Th>
            <Th className="text-right">Date</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {articles.map((article) => (
            <tr key={article.id} className="duration-200 hover:bg-muted/40">
              <Td>
                <span className="flex items-center gap-3">
                  {article.image?.url ? (
                    <Img src={article.image.url} alt={article.imageAlt || article.slug} className="rounded-sm w-14 h-11 shrink-0" cover />
                  ) : (
                    <span className="grid rounded-sm w-14 h-11 shrink-0 place-items-center bg-muted text-body/25">
                      <PiNewspaper className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-body">{article.title ?? "(untitled)"}</span>
                    <span className="block mt-0.5">
                      <Marks article={article} />
                    </span>
                  </span>
                </span>
              </Td>
              <Td className="whitespace-nowrap">{article.category?.name ?? "—"}</Td>
              <Td className="whitespace-nowrap text-body/60">{article.author?.username ?? "—"}</Td>
              <Td>
                <StatusBadge article={article} />
              </Td>
              <Td className="text-right whitespace-nowrap text-body/50">{article.publishedAt ? convertDate(article.publishedAt) : convertDate(article.createdAt)}</Td>
              <Td className="text-right whitespace-nowrap">
                <div className="flex justify-end gap-4">
                  <RowActionLink href={editHref(article)}>Edit</RowActionLink>
                  <RowAction tone="danger" onClick={() => onDelete(article)}>
                    Delete
                  </RowAction>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Panel>
  );
};
