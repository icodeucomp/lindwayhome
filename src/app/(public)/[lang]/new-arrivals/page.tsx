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
  return localizedMetadata(lang, "/new-arrivals", t.meta.newArrivals);
}

export default function NewArrivalsPage() {
  return (
    <>
      <PageHero
        title="New Arrivals"
        description="The newest pieces from our atelier — released as they are finished, never before they are ready."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Collection" }, { name: "New Arrivals" }]}
        cta="Shop Now"
      />
      <ShopLinks />
      <ProductListing defaultSort="new-arrivals" />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
