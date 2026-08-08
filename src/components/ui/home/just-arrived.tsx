"use client";

import { Container } from "@/components";

import { useApiLocale } from "@/hooks";

import { CarouselArrows, CarouselTrack, ProductCard, SectionHeading, StoreEmptyState, StoreSkeletonGrid, useCarousel } from "@/components/ui/storefront";

import { productsApi } from "@/utils";

import type { ApiResponse, Product } from "@/types";

/**
 * "Just Arrived" (reference/Homepage - LIndway.png).
 *
 * A carousel rather than a grid — the mockup shows the fifth card bleeding off the
 * right edge, which is the affordance telling the visitor there is more to scroll.
 *
 * `isActive: true` is passed explicitly: unlike the admin list, a storefront must never
 * show a deactivated product.
 */
export const JustArrived = () => {
  const locale = useApiLocale();
  const { ref, scrollBy } = useCarousel();

  const { data, isLoading, isError } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["home-just-arrived", locale],
    params: { locale, sort: "new-arrivals", isActive: true, limit: 10, page: 1 },
  });

  const products = data?.data ?? [];

  return (
    <Container className="py-16 space-y-8">
      <SectionHeading title="Just Arrived" description="Timeless pieces, newly crafted." action={<CarouselArrows onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} />} />

      {isLoading ? (
        <StoreSkeletonGrid count={4} />
      ) : isError || products.length === 0 ? (
        <StoreEmptyState title="Nothing new just yet" description="New pieces are on their way — check back shortly." />
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
