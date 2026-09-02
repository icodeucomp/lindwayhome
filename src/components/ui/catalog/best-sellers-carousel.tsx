"use client";

import { Container } from "@/components";

import { useApiLocale } from "@/hooks";

import { CarouselArrows, CarouselTrack, ProductCard, SectionHeading, StoreEmptyState, StoreSkeletonGrid, useCarousel } from "@/components/ui/storefront";

import { productsApi } from "@/utils";

import type { ApiResponse, Product } from "@/types";

/**
 * A carousel of best sellers, for closing an editorial page with something to buy.
 *
 * Sorted the same way `/best-sellers` is — `bestSellerRank` first, then `soldCount`
 * (F-34) — because the API owns that order and a second definition of "best selling"
 * would eventually disagree with the first.
 *
 * Copy arrives as props rather than being read here: the callers are server components
 * that already hold the dictionary, and a client component that fetched its own would
 * pull the whole dictionary into the browser bundle for four strings.
 *
 * `isActive: true` is explicit — unlike the admin list, a storefront must never show a
 * deactivated product.
 */

interface BestSellersCarouselProps {
  title: string;
  description?: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Distinguishes the query cache when more than one carousel is on a page. */
  cacheKey: string;
}

export const BestSellersCarousel = ({ title, description, emptyTitle, emptyDescription, cacheKey }: BestSellersCarouselProps) => {
  const locale = useApiLocale();
  const { ref, scrollBy } = useCarousel();

  const { data, isLoading, isError } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: [cacheKey, locale],
    params: { locale, sort: "best-sellers", isActive: true, limit: 10, page: 1 },
  });

  const products = data?.data ?? [];

  return (
    <Container className="py-16 space-y-8">
      <SectionHeading title={title} description={description} action={<CarouselArrows onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} />} />

      {isLoading ? (
        <StoreSkeletonGrid count={4} />
      ) : isError || products.length === 0 ? (
        <StoreEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <CarouselTrack ref={ref}>
          {products.map((product) => (
            <div key={product.id} className="w-[calc(50%-0.625rem)] shrink-0 lg:w-[calc(25%-0.9375rem)]">
              <ProductCard product={product} />
            </div>
          ))}
        </CarouselTrack>
      )}
    </Container>
  );
};
