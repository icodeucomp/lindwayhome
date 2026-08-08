"use client";

import * as React from "react";

import { Container } from "@/components";

import { useApiLocale, useSearchPagination, useToggleState } from "@/hooks";

import { activeAudience, activeBranding, activeGarment } from "@/static/taxonomy";

import { ProductCard, StoreEmptyState, StorePagination, StoreSkeletonGrid } from "@/components/ui/storefront";

import { productsApi } from "@/utils";

import type { ApiResponse, Product, QueryParams } from "@/types";

import { PiCaretDownBold, PiFadersHorizontal } from "react-icons/pi";

/**
 * The product grid shared by every listing route (reference/Product Search.png,
 * Collections Details.png §grid).
 *
 * `fixed` is the axis the route itself pins — `/shop/dresses` fixes `garment` — and it
 * is never offered as a filter, because a filter that contradicts the page you are on
 * has no meaning. Everything else stays adjustable and lives in the URL, so a filtered
 * grid is shareable.
 *
 * The mockups show the FILTER button but never its open state, so the panel below is
 * an interpretation: the same axes the API already supports, in a dropdown.
 */

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "new-arrivals", label: "New Arrivals" },
  { value: "best-sellers", label: "Best Sellers" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
] as const;

type Axis = "branding" | "garment" | "audience";

export interface ProductListingProps {
  /** Axis values pinned by the route. Not filterable, and merged into every query. */
  fixed?: Partial<Record<Axis, string>>;
  /** Sort the route opens with. The visitor can still change it. */
  defaultSort?: QueryParams["sort"];
  /** Anchor for the hero's scroll-down button. */
  id?: string;
}

const FILTER_KEYS = ["branding", "garment", "audience", "sort"] as const;

const ProductListingInner = ({ fixed = {}, defaultSort = "latest", id = "content" }: ProductListingProps) => {
  const locale = useApiLocale();
  const { page, limit, filters, setFilter, resetAll, handlePageChange } = useSearchPagination({ filterKeys: FILTER_KEYS, defaultLimit: 12 });

  const { ref: filterRef, state: filterOpen, toggleState: toggleFilter } = useToggleState();
  const { ref: sortRef, state: sortOpen, toggleState: toggleSort, setState: setSortOpen } = useToggleState();

  const sort = (filters.sort || defaultSort) as QueryParams["sort"];

  // A pinned axis always wins over the query string, so a hand-edited URL cannot make
  // /shop/dresses list skirts.
  const params: QueryParams = {
    locale,
    isActive: true,
    page,
    limit,
    sort,
    branding: fixed.branding ?? filters.branding ?? undefined,
    garment: fixed.garment ?? filters.garment ?? undefined,
    audience: fixed.audience ?? filters.audience ?? undefined,
  };

  const { data, isLoading, isError } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["products-listing", locale, page, limit, sort, params.branding ?? "", params.garment ?? "", params.audience ?? ""],
    params,
  });

  const products = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const allAxes: { key: Axis; label: string; options: { value: string; label: string }[] }[] = [
    { key: "branding", label: "Collection", options: activeBranding().map((entry) => ({ value: entry.key, label: entry.label })) },
    { key: "garment", label: "Garment", options: activeGarment().map((entry) => ({ value: entry.key, label: entry.label })) },
    { key: "audience", label: "Audience", options: activeAudience().map((entry) => ({ value: entry.key, label: entry.label })) },
  ];

  const axes = allAxes.filter((axis) => !fixed[axis.key]);

  const activeFilterCount = axes.filter((axis) => filters[axis.key]).length;

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Sort By";

  return (
    <Container id={id} className="py-14 space-y-8 scroll-mt-40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {axes.length > 0 && (
            <div ref={filterRef} className="relative">
              <button
                type="button"
                onClick={toggleFilter}
                aria-expanded={filterOpen}
                className="flex items-center gap-3 pb-1 text-sm border-b font-heading uppercase tracking-[0.12em] border-primary text-primary"
              >
                Filter {activeFilterCount > 0 && <span className="text-body">({activeFilterCount})</span>}
                <PiFadersHorizontal className="size-4" />
              </button>

              {filterOpen && (
                <div className="absolute left-0 z-40 p-5 mt-3 space-y-5 border shadow-md top-full w-72 border-border bg-light">
                  {axes.map((axis) => (
                    <fieldset key={axis.key} className="space-y-2">
                      <legend className="text-xs font-heading uppercase tracking-[0.14em] text-primary">{axis.label}</legend>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {axis.options.map((option) => {
                          const selected = filters[axis.key] === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFilter(axis.key, selected ? "" : option.value)}
                              className={`border px-3 py-1.5 text-xs transition-colors ${selected ? "border-primary bg-primary text-light" : "border-border text-body hover:border-primary"}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}

                  {activeFilterCount > 0 && (
                    <button type="button" onClick={resetAll} className="text-xs underline text-body/70 underline-offset-4 hover:text-primary">
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div ref={sortRef} className="relative">
            <button type="button" onClick={toggleSort} aria-expanded={sortOpen} className="flex items-center gap-3 pb-1 text-sm border-b font-heading uppercase tracking-[0.12em] border-primary text-primary">
              {sortLabel}
              <PiCaretDownBold className={`size-3 transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
            </button>

            {sortOpen && (
              <ul className="absolute left-0 z-40 py-1 mt-3 border shadow-md top-full w-52 border-border bg-light">
                {SORT_OPTIONS.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilter("sort", option.value === defaultSort ? "" : option.value);
                        setSortOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${option.value === sort ? "text-primary" : "text-body"}`}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {!isLoading && !isError && <p className="text-sm text-primary">View {total} items</p>}
      </div>

      {isLoading ? (
        <StoreSkeletonGrid count={8} />
      ) : isError ? (
        <StoreEmptyState title="We could not load this collection" description="Something went wrong on our side. Please try again in a moment." />
      ) : products.length === 0 ? (
        <StoreEmptyState title="Nothing here yet" description={activeFilterCount > 0 ? "No pieces match these filters." : "New pieces are on their way — check back shortly."} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <StorePagination page={page} totalPages={totalPages} onChange={handlePageChange} className="pt-4" />
        </>
      )}
    </Container>
  );
};

/**
 * `useSearchPagination` reads `useSearchParams`, which forces a client bailout during
 * prerender unless it sits under a Suspense boundary. Wrapping here rather than at each
 * route means a new listing page cannot forget it and break the build.
 */
export const ProductListing = (props: ProductListingProps) => (
  <React.Suspense
    fallback={
      <Container className="py-14">
        <StoreSkeletonGrid count={8} />
      </Container>
    }
  >
    <ProductListingInner {...props} />
  </React.Suspense>
);
