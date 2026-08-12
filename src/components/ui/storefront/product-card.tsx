"use client";

import * as React from "react";

import { Img, LocaleLink } from "@/components";

import { useCartDrawer, useCartStore, useWishlistStore } from "@/hooks";

import { brandByKey } from "@/static/taxonomy";

import { formatIDR, hasDiscount, resolveListPrice, resolveUnitPrice } from "@/utils";

import type { Product } from "@/types";

import { PiHandbagSimple, PiHeartStraight, PiHeartStraightFill } from "react-icons/pi";

import { IMAGE_FALLBACK } from "./ui";

/**
 * The listing card (reference/Collections Details.png, Product Search.png, Homepage).
 *
 * Two states share one footprint inside the image: at rest a brand chip, on hover a
 * row of size chips. Picking a size there adds that variant straight to the bag — it is
 * the only quick-add path in the design, so a card with no size cannot be bought from a
 * listing and links through to its detail page instead.
 *
 * The wishlist heart is not in the mockups, but F-35 requires a wishlist and the header
 * counts it, so without an affordance here the feature is unreachable. It stays quiet:
 * top-right, revealed on hover, filled once saved.
 */

/** A size is buyable when it has stock, or when the whole product is made to order. */
const isSizeAvailable = (quantity: number, isPreOrder: boolean) => quantity > 0 || isPreOrder;

export const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCartStore();
  const openDrawer = useCartDrawer((state) => state.open);
  const wishlist = useWishlistStore();

  const image = product.images?.[0]?.url ?? IMAGE_FALLBACK;
  const brand = brandByKey(product.brand);

  const unitPrice = resolveUnitPrice(product);
  const listPrice = resolveListPrice(product);
  const discounted = hasDiscount(product);

  const sizes = React.useMemo(
    () =>
      [...(product.variants ?? [])]
        .sort((a, b) => (a.size?.order ?? 0) - (b.size?.order ?? 0))
        .map((variant) => ({
          code: variant.size?.code ?? "",
          available: isSizeAvailable(variant.quantity, product.isPreOrder),
        }))
        .filter((size) => size.code),
    [product.variants, product.isPreOrder],
  );

  const addSize = (code: string) => {
    addToCart(
      product.id,
      {
        id: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        price: listPrice,
        discountedPrice: unitPrice,
        images: product.images ?? [],
        brand: product.brand,
        isPreOrder: product.isPreOrder,
      },
      1,
      code,
    );
    openDrawer();
  };

  const availableSizes = sizes.filter((size) => size.available);
  /** One size in stock is an unambiguous quick-add; anything else needs the detail page. */
  const singleSize = availableSizes.length === 1 ? availableSizes[0].code : null;

  return (
    <article className="group">
      <div className="relative overflow-hidden bg-footer/30 aspect-5/6">
        <LocaleLink href={`/product/${product.slug}`} aria-label={product.name}>
          <Img src={image} alt={product.images?.[0]?.alt || product.name} className="w-full h-full transition-transform duration-700 group-hover:scale-105" cover />
        </LocaleLink>

        {discounted && product.discount > 0 && <span className="absolute px-3 py-1.5 text-xs top-0 left-0 bg-primary text-light font-heading">{product.discount}% OFF</span>}

        {product.isPreOrder && <span className="absolute px-3 py-1.5 text-xs top-0 right-0 bg-body/80 text-light font-heading uppercase tracking-[0.1em]">Pre-order</span>}

        <button
          type="button"
          onClick={() => wishlist.toggle(product.id)}
          aria-label={wishlist.has(product.id) ? "Remove from wishlist" : "Save to wishlist"}
          className={`absolute grid transition-opacity size-9 place-items-center bg-light/90 text-primary ${
            product.isPreOrder ? "top-11" : "top-2"
          } right-2 ${wishlist.has(product.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
        >
          {wishlist.has(product.id) ? <PiHeartStraightFill className="size-4" /> : <PiHeartStraight className="size-4" />}
        </button>

        {/* Brand chip at rest. */}
        {brand && (
          <span className="absolute px-3 py-1.5 text-xs transition-opacity -translate-x-1/2 bottom-4 left-1/2 bg-primary text-light font-heading whitespace-nowrap group-hover:opacity-0">
            {brand.label}
          </span>
        )}

        {/* Size chips on hover — the quick-add path. */}
        {sizes.length > 0 && (
          <div className="absolute flex -translate-x-1/2 opacity-0 bottom-4 left-1/2 bg-primary text-light transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {sizes.map((size) => (
              <button
                key={size.code}
                type="button"
                disabled={!size.available}
                onClick={() => addSize(size.code)}
                title={size.available ? `Add size ${size.code}` : `Size ${size.code} is sold out`}
                className={`px-2.5 py-1.5 text-xs font-heading transition-colors ${size.available ? "hover:bg-body" : "cursor-not-allowed text-light/40 line-through"}`}
              >
                {size.code}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <LocaleLink href={`/product/${product.slug}`} className="text-lg transition-colors font-heading text-primary hover:text-body">
            {product.name}
          </LocaleLink>

          {singleSize ? (
            <button type="button" onClick={() => addSize(singleSize)} aria-label={`Add ${product.name} to bag`} className="mt-1 transition-colors shrink-0 text-body hover:text-primary">
              <PiHandbagSimple className="size-5" />
            </button>
          ) : (
            <LocaleLink href={`/product/${product.slug}`} aria-label={`Choose a size for ${product.name}`} className="mt-1 transition-colors shrink-0 text-body hover:text-primary">
              <PiHandbagSimple className="size-5" />
            </LocaleLink>
          )}
        </div>

        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <span>{formatIDR(unitPrice)}</span>
          {discounted && <span className="text-sm line-through text-body/45">{formatIDR(listPrice)}</span>}
        </p>
      </div>
    </article>
  );
};

export const ProductGrid = ({ products, className }: { products: Product[]; className?: string }) => (
  <div className={`grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 ${className ?? ""}`}>
    {products.map((product) => (
      <ProductCard key={product.id} product={product} />
    ))}
  </div>
);
