import type { Metadata } from "next";

import { CollectionStrip, ProductListing, ShopLinks } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { PageHero } from "@/components/ui/storefront";

import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { localizedMetadata } from "@/i18n/metadata";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * The whole catalogue, nothing pinned — every axis is available as a filter.
 *
 * `/shop/[slug]` is this page with one axis fixed by the path. This one exists so the
 * Shop heading in the footer and the FILTER panel have somewhere to start from, rather
 * than a shopper having to pick a clothing type before they can browse at all.
 */

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);
  return localizedMetadata(lang, "/shop", t.meta.shop);
}

export default function ShopPage() {
  return (
    <>
      <PageHero
        title="Shop"
        description="Every Lindway piece, across all three lines — filter by brand, clothing or who it is for."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Shop" }]}
        cta="Browse"
      />
      <ShopLinks />
      <ProductListing />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
