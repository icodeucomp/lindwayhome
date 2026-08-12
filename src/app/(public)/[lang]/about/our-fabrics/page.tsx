import { OurFabrics } from "@/components/ui";
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
  return localizedMetadata(lang, "/about/our-fabrics", t.meta.ourFabrics);
}

export default function OurFabricsPage() {
  return (
    <>
      {/* The intro sentence moved into the page body below the hero, where the design
          puts it — repeating it here would say the same thing twice in one screen. */}
      <PageHero
        title="Our Fabrics"
        description="The textiles behind every Lindway piece, and what each one is best suited to."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }, { name: "Our Fabrics" }]}
        cta="Discover Now"
      />
      <OurFabrics />
    </>
  );
}
