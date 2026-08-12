import { Wishlist } from "@/components/ui/catalog";
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
  return localizedMetadata(lang, "/wishlist", t.meta.wishlist);
}

export default function WishlistPage() {
  return (
    <>
      <PageHero
        title="Wishlist"
        description="The pieces you have saved, kept on this device."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Wishlist" }]}
        cta="View Saved"
      />
      <Wishlist />
    </>
  );
}
