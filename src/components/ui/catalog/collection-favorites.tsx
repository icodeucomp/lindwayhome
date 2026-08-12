"use client";

import { Container, Img, LocaleLink, richTextToPlain } from "@/components";

import { useApiLocale } from "@/hooks";

import { IMAGE_FALLBACK } from "@/components/ui/storefront";

import { productsApi } from "@/utils";

import type { ApiResponse, Product } from "@/types";

/**
 * The pair of wide feature cards on a collection page (reference/Collections Details.png).
 *
 * This is F-36: `isFavorite` keeps its v1 meaning — an admin flag for featured pieces
 * (D11) — and surfaces here, on the product's own brand page. It is not the
 * wishlist, which is per-visitor and lives in localStorage.
 *
 * The blurb is the product's `description`, flattened from Tiptap: there is no plain
 * excerpt field on Product, and rendering formatted rich text inside an image overlay
 * would fight the layout.
 */
export const CollectionFavorites = ({ brand }: { brand: string }) => {
  const locale = useApiLocale();

  const { data, isLoading } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["collection-favorites", brand, locale],
    params: { locale, brand, isFavorite: true, isActive: true, limit: 2, page: 1 },
  });

  const products = data?.data ?? [];

  if (isLoading || products.length === 0) return null;

  return (
    <Container className="grid grid-cols-1 gap-5 py-8 md:grid-cols-2">
      {products.map((product) => {
        const blurb = richTextToPlain(product.description);

        return (
          <article key={product.id} className="relative overflow-hidden group aspect-4/3 bg-footer/30">
            {/* Absolute placement goes on a wrapper — `Img` sets `relative` itself. */}
            <div className="absolute inset-0">
              <Img
                src={product.images?.[0]?.url ?? IMAGE_FALLBACK}
                alt={product.images?.[0]?.alt || product.name}
                className="w-full h-full transition-transform duration-700 group-hover:scale-105"
                cover
              />
            </div>
            <div className="absolute inset-0 bg-linear-to-t from-body/85 via-body/30 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-8 space-y-2 text-light">
              <LocaleLink href={`/product/${product.slug}`} className="block text-2xl font-heading">
                {product.name}
              </LocaleLink>

              {blurb && <p className="max-w-lg text-sm line-clamp-2 text-light/90">{blurb}</p>}

              <LocaleLink href={`/product/${product.slug}`} className="inline-block pt-2 text-sm border-b font-heading uppercase tracking-[0.14em] border-light/70">
                Add to Cart
              </LocaleLink>
            </div>
          </article>
        );
      })}
    </Container>
  );
};
