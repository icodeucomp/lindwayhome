"use client";

import * as React from "react";

import { notFound } from "next/navigation";

import { Container, Img, LocaleLink, RichText, isRichTextEmpty } from "@/components";

import { useApiLocale, useCartDrawer, useCartStore, useWishlistStore } from "@/hooks";

import { brandingByKey } from "@/static/taxonomy";

import { AccordionItem, Breadcrumb, IMAGE_FALLBACK, StoreButton, StoreSkeletonGrid } from "@/components/ui/storefront";

import { CollectionStrip } from "./collection-strip";
import { RelatedProducts } from "./related-products";

import { formatIDR, hasDiscount, productsApi, resolveListPrice, resolveUnitPrice } from "@/utils";

import type { Product } from "@/types";

import { PiCaretDown, PiCaretUp, PiHeartStraight, PiHeartStraightFill, PiInfo, PiMinus, PiPlus } from "react-icons/pi";

/**
 * Product detail (reference/Product Details.png).
 *
 * The four content panels below the buy box come from `ProductTranslation`, resolved
 * through the four-level fallback chain (§B6.1) by the API — so a product with no
 * translation rows still renders the store-wide defaults rather than four empty
 * accordions. The Size Guide panel is the assigned `SizeGuide`, transposed: the mockup
 * puts sizes across the top and measurements down the side, which is the reverse of
 * how `SizeGuideRow` stores them.
 */

const THUMBNAIL_WINDOW = 3;

export const ProductDetail = ({ slug }: { slug: string }) => {
  const locale = useApiLocale();

  const { addToCart } = useCartStore();
  const openDrawer = useCartDrawer((state) => state.open);
  const wishlist = useWishlistStore();

  const { data, isLoading, isError } = productsApi.useGetProduct<{ success: boolean; data: Product }>({
    key: ["product", slug, locale],
    id: slug,
    params: { locale },
  });

  const product = data?.data;

  const [activeImage, setActiveImage] = React.useState(0);
  const [thumbOffset, setThumbOffset] = React.useState(0);
  const [selectedSize, setSelectedSize] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);

  const variants = React.useMemo(() => [...(product?.variants ?? [])].sort((a, b) => (a.size?.order ?? 0) - (b.size?.order ?? 0)), [product?.variants]);

  if (isLoading) {
    return (
      <Container className="py-16">
        <StoreSkeletonGrid count={4} />
      </Container>
    );
  }

  // A 404 from the API and an inactive product are the same thing to a shopper: the
  // page does not exist. Rendering it anyway would let a deactivated product stay
  // reachable by its old URL.
  if (isError || !product || !product.isActive) notFound();

  const images = product.images?.length ? product.images : [];
  const branding = brandingByKey(product.branding);
  const unitPrice = resolveUnitPrice(product);
  const listPrice = resolveListPrice(product);
  const discounted = hasDiscount(product);

  const availableFor = (code: string) => {
    const variant = variants.find((item) => item.size?.code === code);
    if (!variant) return false;
    return variant.quantity > 0 || product.isPreOrder;
  };

  const maxThumbOffset = Math.max(0, images.length - THUMBNAIL_WINDOW);

  const handleAddToCart = () => {
    if (!selectedSize) return;

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
        branding: product.branding,
        isPreOrder: product.isPreOrder,
      },
      quantity,
      selectedSize,
    );

    openDrawer();
  };

  const guide = product.sizeGuide;
  const guideSizes = [...(guide?.rows ?? [])].sort((a, b) => (a.size?.order ?? 0) - (b.size?.order ?? 0));
  // Measurement keys are stable identifiers; their display labels are per-locale
  // (§B4.2), so the header column reads from `parameterLabels` with the key as fallback.
  const measurementKeys = Array.from(new Set(guideSizes.flatMap((row) => Object.keys(row.measurements ?? {}))));

  const panels = [
    { title: "Fabric Information", value: product.fabricInformation },
    { title: "Shipping & Delivery", value: product.shippingDelivery },
    { title: "Return & Exchanges Policy", value: product.returnPolicy },
  ].filter((panel) => !isRichTextEmpty(panel.value));

  return (
    <>
      <Container className="pt-8">
        <Breadcrumb
          tone="dark"
          items={[
            { name: "Home", href: "/" },
            { name: "Collections" },
            ...(branding ? [{ name: branding.label, href: `/collections/${branding.slug}` }] : []),
            { name: product.name },
          ]}
        />
      </Container>

      <Container className="grid grid-cols-1 gap-10 py-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="flex gap-4">
          {images.length > 1 && (
            <div className="flex-col hidden w-24 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setThumbOffset((value) => Math.max(0, value - 1))}
                disabled={thumbOffset === 0}
                aria-label="Previous images"
                className="grid py-2 place-items-center bg-primary/60 text-light disabled:opacity-40"
              >
                <PiCaretUp className="size-5" />
              </button>

              {images.slice(thumbOffset, thumbOffset + THUMBNAIL_WINDOW).map((image, index) => {
                const realIndex = thumbOffset + index;
                return (
                  <button
                    // `filename`, not `url`: two images on one product can share a URL —
                    // every one of them does while PLACEHOLDER_IMAGE stands in — and the
                    // filename stays unique per upload. `realIndex` is the last resort,
                    // since a node written by hand may carry no filename at all.
                    key={image.filename || realIndex}
                    type="button"
                    onClick={() => setActiveImage(realIndex)}
                    aria-label={`View image ${realIndex + 1}`}
                    className={`aspect-3/4 border-2 ${realIndex === activeImage ? "border-primary" : "border-transparent"}`}
                  >
                    <Img src={image.url} alt={image.alt || product.name} className="w-full h-full bg-footer/30" cover />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setThumbOffset((value) => Math.min(maxThumbOffset, value + 1))}
                disabled={thumbOffset >= maxThumbOffset}
                aria-label="More images"
                className="grid py-2 place-items-center bg-primary/60 text-light disabled:opacity-40"
              >
                <PiCaretDown className="size-5" />
              </button>
            </div>
          )}

          <Img src={images[activeImage]?.url ?? IMAGE_FALLBACK} alt={images[activeImage]?.alt || product.name} className="flex-1 aspect-3/4 bg-footer/30" cover />
        </div>

        {/* Buy box */}
        <div className="space-y-5">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-heading text-primary">{product.name}</h1>
              <button
                type="button"
                onClick={() => wishlist.toggle(product.id)}
                aria-label={wishlist.has(product.id) ? "Remove from wishlist" : "Save to wishlist"}
                className="mt-2 transition-colors text-primary hover:text-body"
              >
                {wishlist.has(product.id) ? <PiHeartStraightFill className="size-6" /> : <PiHeartStraight className="size-6" />}
              </button>
            </div>
            {branding && (
              <LocaleLink href={`/collections/${branding.slug}`} className="text-lg text-body/70 hover:text-primary">
                {branding.label}
              </LocaleLink>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-heading text-body">{formatIDR(unitPrice)}</p>
            {discounted && <p className="text-lg line-through text-body/45">{formatIDR(listPrice)}</p>}
          </div>

          {variants.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {variants.map((variant) => {
                const code = variant.size?.code ?? "";
                const available = availableFor(code);
                const selected = selectedSize === code;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedSize(code)}
                    title={available ? undefined : `Size ${code} is sold out`}
                    className={`min-w-11 border px-3 py-2 text-sm transition-colors ${
                      selected ? "border-primary text-primary" : available ? "border-border text-body hover:border-primary" : "cursor-not-allowed border-border text-body/30 line-through"
                    }`}
                  >
                    {code}
                  </button>
                );
              })}

              {guide && (
                <a href="#size-guide" className="pb-1 ml-2 text-sm border-b font-heading uppercase tracking-[0.1em] border-primary text-primary">
                  Size Guide
                </a>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-stretch gap-3">
            <div className="flex items-center border border-border">
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity" className="grid size-12 place-items-center text-body hover:text-primary">
                <PiMinus className="size-4" />
              </button>
              <span className="w-10 text-center text-body">{quantity}</span>
              <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity" className="grid size-12 place-items-center text-body hover:text-primary">
                <PiPlus className="size-4" />
              </button>
            </div>

            <StoreButton onClick={handleAddToCart} disabled={variants.length > 0 && !selectedSize} className="flex-1 text-sm">
              {variants.length > 0 && !selectedSize ? "Select a size" : "Add to Cart"}
            </StoreButton>
          </div>

          {!isRichTextEmpty(product.notes) && (
            <div className="flex gap-3 text-sm text-body/85">
              <PiInfo className="mt-0.5 shrink-0 size-5 text-primary" />
              <RichText value={product.notes} className="space-y-1" />
            </div>
          )}

          {!isRichTextEmpty(product.description) && (
            <div className="pt-4 border-t border-border">
              <RichText value={product.description} className="text-sm leading-relaxed text-body" />
            </div>
          )}

          <div>
            {guide && guideSizes.length > 0 && (
              <div id="size-guide" className="scroll-mt-40">
                <AccordionItem title={guide.title || "Size Guide"} defaultOpen>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-left border border-border" />
                          {guideSizes.map((row) => (
                            <th key={row.id} className="p-2 font-medium text-center border border-border text-body">
                              {row.size?.code}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {measurementKeys.map((key, index) => (
                          <tr key={key}>
                            <td className="p-2 font-medium border border-border text-body">
                              {index + 1}. {guide.parameterLabels?.[key] ?? key}
                            </td>
                            {guideSizes.map((row) => (
                              <td key={`${row.id}-${key}`} className="p-2 text-center border border-border text-body">
                                {row.measurements?.[key] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionItem>
              </div>
            )}

            {panels.map((panel) => (
              <AccordionItem key={panel.title} title={panel.title} defaultOpen>
                <RichText value={panel.value} />
              </AccordionItem>
            ))}
          </div>
        </div>
      </Container>

      {/* Both closing sections need the branding, which is only known once the product
          has loaded — so they live here rather than in the route. */}
      <RelatedProducts branding={product.branding} exclude={product.id} />
      <CollectionStrip exclude={product.branding} />
    </>
  );
};
