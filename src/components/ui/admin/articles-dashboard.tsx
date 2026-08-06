"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { articleCategoriesApi, articlesApi } from "@/utils";

import { ApiResponse, Article, ArticleCategory } from "@/types";

import { AdminButton, AdminLinkButton, ArticlesLists, ConfirmDialog, DataPagination, FilterDropdown, FilterRow, ListToolbar, PageHeader, ResultCount, SearchBar, ToolbarRow, ViewToggle } from "./slicing";

const ALL = { value: "", label: "All" };

const STATUS_OPTIONS = [ALL, { value: "true", label: "Published" }, { value: "false", label: "Draft" }];
const FEATURED_OPTIONS = [ALL, { value: "true", label: "Featured" }, { value: "false", label: "Not featured" }];

const FILTER_KEYS = ["categoryId", "published", "featured"] as const;

export const ArticlesDashboard = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, page, limit, handlePageChange, filters, setFilter, resetAll, hasFilters, view, setView } = useSearchPagination({
    filterKeys: FILTER_KEYS,
    defaultView: "grid",
    defaultLimit: 12,
  });

  const [toDelete, setToDelete] = React.useState<Article | null>(null);

  const { data: categoriesData } = articleCategoriesApi.useGetArticleCategories<ApiResponse<ArticleCategory[]>>({ key: ["article-categories"] });

  const { data, isLoading, isError } = articlesApi.useGetArticles<ApiResponse<Article[]>>({
    key: ["articles", searchQuery, page, limit, filters.categoryId, filters.published, filters.featured],
    enabled: isAuthenticated,
    // `published` is only sent when the admin filters on it — the admin list must show
    // drafts, and a draft nobody can see is a draft nobody can finish.
    params: { search: searchQuery, page, limit, categoryId: filters.categoryId, published: filters.published, featured: filters.featured },
  });

  const deleteArticle = articlesApi.useDeleteArticle({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-categories"] });
      setToDelete(null);
    },
  });

  const categoryOptions = [ALL, ...(categoriesData?.data ?? []).map((category) => ({ value: category.id, label: category.name ?? category.slug }))];
  const pagination = data?.pagination;

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Articles"
        description="The Journal. Drafts stay here until you publish them — publishedAt is the on/off switch, so there is no separate active flag."
        actions={<AdminLinkButton href="/admin/dashboard/articles/create" variant="solid">New article</AdminLinkButton>}
      />

      <ListToolbar>
        <SearchBar value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search title or slug…" />

        <ToolbarRow>
          <FilterRow>
            <FilterDropdown label="Category" value={filters.categoryId} options={categoryOptions} onChange={(value) => setFilter("categoryId", value)} />
            <FilterDropdown label="Status" value={filters.published} options={STATUS_OPTIONS} onChange={(value) => setFilter("published", value)} />
            <FilterDropdown label="Featured" value={filters.featured} options={FEATURED_OPTIONS} onChange={(value) => setFilter("featured", value)} />
            {hasFilters && (
              <AdminButton size="sm" variant="ghost" onClick={resetAll}>
                Clear
              </AdminButton>
            )}
          </FilterRow>

          <div className="flex items-center gap-4">
            {pagination && <ResultCount total={pagination.total} noun="article" filtered={hasFilters} />}
            <ViewToggle view={view} onChange={setView} />
          </div>
        </ToolbarRow>
      </ListToolbar>

      <ArticlesLists articles={data?.data ?? []} view={view} isLoading={isLoading} isError={isError} hasFilters={hasFilters} onDelete={setToDelete} />

      {pagination && <DataPagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={handlePageChange} />}

      <ConfirmDialog
        isVisible={toDelete !== null}
        title={`Delete "${toDelete?.title ?? "this article"}"?`}
        description="The article, its translations and its cover image are removed permanently. Unpublish it instead if you only want it off the site."
        confirmLabel="Delete article"
        isPending={deleteArticle.isPending}
        onConfirm={() => toDelete && deleteArticle.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
