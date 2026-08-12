import { JournalList } from "@/components/ui/journal";
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
  return localizedMetadata(lang, "/journal", t.meta.journal);
}

export default function JournalPage() {
  return (
    <>
      <PageHero
        title="Journal"
        description="Notes on craft, fabric and the people behind each piece."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Journal" }]}
        cta="Explore Now"
      />
      <JournalList />
    </>
  );
}
