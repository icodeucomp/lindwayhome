"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { AUDIENCE, BRANDING, CLOTHING } from "@/static/taxonomy";

import { productsApi } from "@/utils";

import { ApiResponse, Product } from "@/types";

import { AdminButton, AdminLinkButton, ConfirmDialog, DataPagination, FilterDropdown, FilterRow, ListToolbar, PageHeader, ProductsLists, ResultCount, SearchBar, ToolbarRow, ViewToggle } from "./slicing";

const ALL = { value: "", label: "All" };

// Inactive brandings are still offered as filters: products tagged with one are not
// orphaned when it is hidden from the storefront, and the admin needs to find them.
const BRANDING_OPTIONS = [ALL, ...BRANDING.map((entry) => ({ value: entry.key, label: entry.label }))];
const CLOTHING_OPTIONS = [ALL, ...CLOTHING.map((entry) => ({ value: entry.key, label: entry.label }))];
const AUDIENCE_OPTIONS = [ALL, ...AUDIENCE.map((entry) => ({ value: entry.key, label: entry.label }))];

const STATUS_OPTIONS = [ALL, { value: "true", label: "Active" }, { value: "false", label: "Inactive" }];

const SORT_OPTIONS = [
  { value: "", label: "Recently updated" },
  { value: "new-arrivals", label: "New arrivals" },
  { value: "best-sellers", label: "Best sellers" },
  { value: "price-asc", label: "Price low–high" },
  { value: "price-desc", label: "Price high–low" },
];

const FILTER_KEYS = ["branding", "clothing", "audience", "isActive", "sort"] as const;

export const ProductsDashboard = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, page, limit, handlePageChange, filters, setFilter, resetAll, hasFilters, view, setView } = useSearchPagination({
    filterKeys: FILTER_KEYS,
    defaultView: "grid",
    defaultLimit: 12,
  });

  const [toDelete, setToDelete] = React.useState<Product | null>(null);

  const { data, isLoading, isError } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["products", searchQuery, page, limit, filters.branding, filters.clothing, filters.audience, filters.isActive, filters.sort],
    enabled: isAuthenticated,
    params: {
      search: searchQuery,
      page,
      limit,
      branding: filters.branding,
      clothing: filters.clothing,
      audience: filters.audience,
      // The admin list must show inactive products too, so isActive is only sent when
      // the admin actually filters on it — an unfiltered list is the whole catalog.
      ...(filters.isActive ? { isActive: filters.isActive === "true" } : {}),
      sort: (filters.sort || undefined) as "new-arrivals" | "best-sellers" | "price-asc" | "price-desc" | undefined,
    },
  });

  const deleteProduct = productsApi.useDeleteProduct({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setToDelete(null);
    },
  });

  const pagination = data?.pagination;

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Everything you sell. Add new pieces, change prices, and see what is running low. You set the quantity for each size, and the total stock adds itself up."
        actions={<AdminLinkButton href="/admin/dashboard/products/create" variant="solid">New product</AdminLinkButton>}
      />

      <ListToolbar>
        <SearchBar value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search name, SKU or slug…" />

        <ToolbarRow>
          <FilterRow>
            <FilterDropdown label="Branding" value={filters.branding} options={BRANDING_OPTIONS} onChange={(value) => setFilter("branding", value)} />
            <FilterDropdown label="Clothing" value={filters.clothing} options={CLOTHING_OPTIONS} onChange={(value) => setFilter("clothing", value)} />
            <FilterDropdown label="Audience" value={filters.audience} options={AUDIENCE_OPTIONS} onChange={(value) => setFilter("audience", value)} />
            <FilterDropdown label="Status" value={filters.isActive} options={STATUS_OPTIONS} onChange={(value) => setFilter("isActive", value)} />
            <FilterDropdown label="Sort" value={filters.sort} options={SORT_OPTIONS} onChange={(value) => setFilter("sort", value)} />
            {hasFilters && (
              <AdminButton size="sm" variant="ghost" onClick={resetAll}>
                Clear
              </AdminButton>
            )}
          </FilterRow>

          <div className="flex items-center gap-4">
            {pagination && <ResultCount total={pagination.total} noun="product" filtered={hasFilters} />}
            <ViewToggle view={view} onChange={setView} />
          </div>
        </ToolbarRow>
      </ListToolbar>

      <ProductsLists products={data?.data ?? []} view={view} isLoading={isLoading} isError={isError} hasFilters={hasFilters} onDelete={setToDelete} />

      {pagination && <DataPagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={handlePageChange} />}

      <ConfirmDialog
        isVisible={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "this product"}?`}
        description="If anyone has already bought this product, it will be hidden from the shop instead of deleted — that way your past orders and sales figures stay correct."
        confirmLabel="Delete product"
        isPending={deleteProduct.isPending}
        onConfirm={() => toDelete && deleteProduct.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
