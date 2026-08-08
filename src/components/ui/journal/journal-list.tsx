"use client";

import * as React from "react";

import { Container } from "@/components";

import { useApiLocale, useSearchPagination, useToggleState } from "@/hooks";

import { ArticleCard, ArticleFeatureCard, CarouselArrows, CarouselTrack, SectionHeading, StoreEmptyState, StorePagination, StoreSkeletonGrid, useCarousel } from "@/components/ui/storefront";

import { articleCategoriesApi, articlesApi } from "@/utils";

import type { ApiResponse, Article, ArticleCategory } from "@/types";

import { PiCaretDownBold } from "react-icons/pi";

/**
 * Journal index (reference/Journal.png).
 *
 * Two queries on purpose: the featured row is `featured=true` and must not be paged,
 * while the grid below is the full published list with its own paging and category
 * filter. Both pass `published=true` — the admin list shows drafts by design (§C4), so
 * omitting it here would publish unfinished work.
 */
const JournalListInner = () => {
  const locale = useApiLocale();
  const { page, limit, filters, setFilter, handlePageChange } = useSearchPagination({ filterKeys: ["category"], defaultLimit: 8 });
  const { ref, scrollBy } = useCarousel();
  const { ref: categoryRef, state: categoryOpen, toggleState: toggleCategory, setState: setCategoryOpen } = useToggleState();

  const { data: featuredData } = articlesApi.useGetArticles<ApiResponse<Article[]>>({
    key: ["journal-featured", locale],
    params: { locale, published: "true", featured: "true", limit: 6, page: 1 },
  });

  const { data: categoryData } = articleCategoriesApi.useGetArticleCategories<ApiResponse<ArticleCategory[]>>({
    key: ["journal-categories", locale],
    params: { locale, limit: 50, page: 1 },
  });

  const { data, isLoading, isError } = articlesApi.useGetArticles<ApiResponse<Article[]>>({
    key: ["journal-list", locale, page, limit, filters.category ?? ""],
    params: { locale, published: "true", categoryId: filters.category || undefined, page, limit },
  });

  const featured = featuredData?.data ?? [];
  const categories = (categoryData?.data ?? []).filter((category) => category.isActive);
  const articles = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const activeCategory = categories.find((category) => category.id === filters.category);

  return (
    <>
      {featured.length > 0 && (
        <Container className="py-14 space-y-8">
          <SectionHeading title="Featured Read" description="Start here — our most essential articles." action={featured.length > 2 ? <CarouselArrows onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} /> : undefined} />

          <CarouselTrack ref={ref}>
            {featured.map((article) => (
              <div key={article.id} className="w-full shrink-0 md:w-[calc(50%-0.625rem)]">
                <ArticleFeatureCard article={article} />
              </div>
            ))}
          </CarouselTrack>
        </Container>
      )}

      <Container id="content" className="py-8 space-y-8 scroll-mt-40">
        <SectionHeading variant="title" title="Explore The Journal" description="Notes on craft, fabric and the people behind each piece." />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div ref={categoryRef} className="relative">
            <button type="button" onClick={toggleCategory} aria-expanded={categoryOpen} className="flex items-center gap-4 px-4 py-2.5 text-sm border font-heading uppercase tracking-[0.12em] border-primary text-primary">
              {activeCategory?.name ?? "All"}
              <PiCaretDownBold className={`size-3 transition-transform duration-200 ${categoryOpen ? "rotate-180" : ""}`} />
            </button>

            {categoryOpen && (
              <ul className="absolute left-0 z-40 py-1 mt-2 border shadow-md top-full min-w-52 border-border bg-light">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("category", "");
                      setCategoryOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-muted ${!filters.category ? "text-primary" : "text-body"}`}
                  >
                    All
                  </button>
                </li>
                {categories.map((category) => (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilter("category", category.id);
                        setCategoryOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-muted ${filters.category === category.id ? "text-primary" : "text-body"}`}
                    >
                      {category.name ?? category.slug}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!isLoading && !isError && <p className="text-sm text-primary">View {total} items</p>}
        </div>

        {isLoading ? (
          <StoreSkeletonGrid count={8} />
        ) : isError ? (
          <StoreEmptyState title="We could not load the journal" description="Something went wrong on our side. Please try again in a moment." />
        ) : articles.length === 0 ? (
          <StoreEmptyState title="No stories yet" description={filters.category ? "Nothing published in this category yet." : "The first stories are being written."} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            <StorePagination page={page} totalPages={totalPages} onChange={handlePageChange} className="pt-4" />
          </>
        )}
      </Container>
    </>
  );
};

/**
 * Same reason as `ProductListing`: `useSearchPagination` reads `useSearchParams`,
 * which bails out of prerendering unless it sits under a Suspense boundary.
 */
export const JournalList = () => (
  <React.Suspense
    fallback={
      <Container className="py-14">
        <StoreSkeletonGrid count={8} />
      </Container>
    }
  >
    <JournalListInner />
  </React.Suspense>
);
