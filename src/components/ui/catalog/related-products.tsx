"use client";

import { Container } from "@/components";

import { useApiLocale } from "@/hooks";

import { ArrowLink, CarouselArrows, CarouselTrack, ProductCard, SectionHeading, StoreSkeletonGrid, useCarousel } from "@/components/ui/storefront";

import { productsApi } from "@/utils";

import type { ApiResponse, Product } from "@/types";

/**
 * "You May Also Like" (reference/Product Details.png).
 *
 * Related by branding, which is the only affinity the model actually carries — there is
 * no recommendation engine and inventing one from `soldCount` would just re-list the
 * best sellers on every product page. `exclude` keeps the current product out.
 */
export const RelatedProducts = ({ branding, exclude }: { branding: string; exclude: string }) => {
  const locale = useApiLocale();
  const { ref, scrollBy } = useCarousel();

  const { data, isLoading } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["related-products", branding, locale],
    // One over the display count, so removing the current product still fills the row.
    params: { locale, branding, isActive: true, limit: 9, page: 1 },
  });

  const products = (data?.data ?? []).filter((product) => product.id !== exclude);

  if (!isLoading && products.length === 0) return null;

  return (
    <Container className="py-16 space-y-8">
      <SectionHeading
        title="You May Also Like"
        description="Each piece is made-to-order and carefully handcrafted for you"
        action={
          <div className="flex items-center gap-6">
            <ArrowLink href="/new-arrivals">View All Products</ArrowLink>
            <CarouselArrows onPrev={() => scrollBy(-1)} onNext={() => scrollBy(1)} />
          </div>
        }
      />

      {isLoading ? (
        <StoreSkeletonGrid count={4} />
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
