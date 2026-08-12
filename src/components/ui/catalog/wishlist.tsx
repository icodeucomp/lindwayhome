"use client";

import { Container } from "@/components";

import { useApiLocale, useWishlistStore } from "@/hooks";

import { ProductCard, StoreEmptyState, StoreLinkButton, StoreSkeletonGrid } from "@/components/ui/storefront";

import { productsApi } from "@/utils";

import type { ApiResponse, Product } from "@/types";

/**
 * Wishlist (F-35).
 *
 * There is no mockup for this page and no backend for the feature — the wishlist is
 * per-visitor and lives only in localStorage (D11), so this reads the saved ids and
 * filters the catalog client-side rather than calling an endpoint that does not exist.
 *
 * It is deliberately NOT `Product.isFavorite`, which is an admin flag shared by every
 * visitor and surfaces on the brand page instead.
 *
 * Filtering client-side is acceptable because a wishlist is small by nature; if it ever
 * outgrows one page of the catalog, the API needs an id-list filter.
 */
export const Wishlist = () => {
  const locale = useApiLocale();
  const wishlist = useWishlistStore();
  const savedIds = wishlist.items;

  const { data, isLoading, isError } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["wishlist-products", locale],
    params: { locale, isActive: true, limit: 100, page: 1 },
    enabled: savedIds.length > 0,
  });

  const products = (data?.data ?? []).filter((product) => savedIds.includes(product.id));

  return (
    <Container id="content" className="py-16 space-y-8 scroll-mt-40">
      {savedIds.length === 0 ? (
        <StoreEmptyState
          title="Your wishlist is empty"
          description="Save the pieces you love and they will be waiting here."
          action={<StoreLinkButton href="/new-arrivals">Start Shopping</StoreLinkButton>}
        />
      ) : isLoading ? (
        <StoreSkeletonGrid count={4} />
      ) : isError ? (
        <StoreEmptyState title="We could not load your wishlist" description="Something went wrong on our side. Please try again in a moment." />
      ) : products.length === 0 ? (
        // Saved ids that match nothing are products that were deactivated or removed
        // since they were saved — say so rather than showing an empty grid.
        <StoreEmptyState
          title="These pieces are no longer available"
          description="The items you saved have sold out or been retired."
          action={<StoreLinkButton href="/new-arrivals">Browse New Arrivals</StoreLinkButton>}
        />
      ) : (
        <>
          <p className="text-sm text-primary">
            {products.length} saved {products.length === 1 ? "piece" : "pieces"}
          </p>

          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </Container>
  );
};
