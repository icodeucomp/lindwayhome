import { EverySnap, ReturnExchanges } from "@/components/ui";
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
  return localizedMetadata(lang, "/customer-care/return-exchanges", t.meta.returnExchanges);
}

export default async function ReturnExchangesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // The layout already 404s an unknown locale; falling back keeps the types honest.
  const t = await getDictionary(isLocale(lang) ? lang : "en");
  const copy = t.pages.returnExchanges;

  return (
    <>
      <PageHero
        title={copy.hero.title}
        description={copy.hero.description}
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Return & Exchanges" }]}
        cta={copy.hero.cta}
      />
      <ReturnExchanges dictionary={t} />
      <EverySnap />
    </>
  );
}
