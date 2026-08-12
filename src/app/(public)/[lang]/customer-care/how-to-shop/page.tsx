import { EverySnap, HowToShop } from "@/components/ui";
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
  return localizedMetadata(lang, "/customer-care/how-to-shop", t.meta.howToShop);
}

export default function HowToShopPage() {
  return (
    <>
      <PageHero
        title="How to Shop"
        description="At Lindway, we aim to make your shopping experience as seamless and personal as our designs."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "How to Shop" }]}
        cta="Discover Now"
      />
      <HowToShop />
      <EverySnap />
    </>
  );
}
