import { EverySnap } from "@/components/ui";

import { AtelierPromos, Collections, FabricLibraryPromo, Hero, Journal, JustArrived } from "@/components/ui/home";

import { careValues, craftValues, FeatureStrip } from "@/components/ui/storefront";

import type { Metadata } from "next";

import { isLocale } from "@/i18n/config";

import { getDictionary } from "@/i18n/get-dictionary";

import { localizedMetadata } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  // The layout already 404s an unknown locale; metadata just declines to guess.
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);
  return localizedMetadata(lang, "/", t.meta.home);
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureStrip items={craftValues} />
      <JustArrived />
      <Collections />
      <AtelierPromos />
      <Journal />
      <FabricLibraryPromo />
      <FeatureStrip items={careValues} />
      <EverySnap />
    </>
  );
}
