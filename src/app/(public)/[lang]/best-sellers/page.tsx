import { CollectionStrip, ProductListing, ShopLinks } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

import type { Metadata } from "next";

import { isLocale } from "@/i18n/config";

import { getDictionary } from "@/i18n/get-dictionary";

import { localizedMetadata } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  // The layout already 404s an unknown locale; metadata just declines to guess.
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);
  return localizedMetadata(lang, "/best-sellers", t.meta.bestSellers);
}

export default function BestSellersPage() {
  return (
    <>
      <PageHero
        title="Best Sellers"
        description="Explore the most-loved designs, chosen for their refined silhouettes, enduring craftsmanship, and everyday sophistication."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Collection" }, { name: "Best Sellers" }]}
        cta="Shop Now"
      />
      <ShopLinks />
      <ProductListing defaultSort="best-sellers" />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
