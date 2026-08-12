import { SustainabilityContent } from "@/components/ui/about";
import { EverySnap } from "@/components/ui";
import { careValues, FeatureStrip, PageHero } from "@/components/ui/storefront";

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
  return localizedMetadata(lang, "/about/sustainability", t.meta.sustainability);
}

export default function SustainabilityPage() {
  return (
    <>
      <PageHero
        title="Sustainability"
        description="Thoughtful materials, timeless craftsmanship, and pieces built to outlast a season."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }, { name: "Sustainability" }]}
        cta="Discover Now"
      />
      <SustainabilityContent />
      <FeatureStrip items={careValues} />
      <EverySnap />
    </>
  );
}
