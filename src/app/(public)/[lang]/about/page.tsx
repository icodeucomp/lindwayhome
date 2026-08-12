import { ArtisanJourney, OurStory, Philosophy, SustainabilityPromo, WhyChooseUs } from "@/components/ui/about";
import { EverySnap } from "@/components/ui";
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
  return localizedMetadata(lang, "/about", t.meta.about);
}

/**
 * About is a single page (reference/About Us.png), not the five separate routes §B2.1
 * sketched. Our Story and Our Artisan are sections here; Our Production, Sustainability
 * and Our Fabrics keep their own routes because they have their own mockups.
 */
export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getDictionary(isLocale(lang) ? lang : "en");
  const copy = t.pages.about;

  return (
    <>
      <PageHero
        title={copy.hero.title}
        description={copy.hero.description}
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }]}
        cta={copy.hero.cta}
      />
      <OurStory dictionary={t} />
      <Philosophy />
      <WhyChooseUs dictionary={t} />
      <ArtisanJourney dictionary={t} />
      <SustainabilityPromo dictionary={t} />
      <EverySnap />
    </>
  );
}
