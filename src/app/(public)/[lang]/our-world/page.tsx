import { EverySnap, OurWorld } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

import type { Metadata } from "next";

import { isLocale } from "@/i18n/config";

import { getDictionary } from "@/i18n/get-dictionary";

import { localizedMetadata } from "@/i18n/metadata";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  // The layout already 404s an unknown locale; metadata just declines to guess.
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);
  return localizedMetadata(lang, "/our-world", t.meta.ourWorld);
}

export default async function OurWorldPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = await getDictionary(isLocale(lang) ? lang : "en");
  const copy = t.pages.ourWorld;

  return (
    <>
      <PageHero
        title={copy.hero.title}
        description={copy.hero.description}
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: copy.hero.title }]}
        cta={copy.hero.cta}
        align="center"
      />
      <OurWorld dictionary={t} />
      <EverySnap />
    </>
  );
}
