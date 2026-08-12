import { ProductionTabs } from "@/components/ui/about";
import { EverySnap } from "@/components/ui";
import { PageHero, PromoBanner } from "@/components/ui/storefront";
import { Container } from "@/components";

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
  return localizedMetadata(lang, "/about/our-production", t.meta.ourProduction);
}

export default function OurProductionPage() {
  return (
    <>
      <PageHero
        title="Our Production"
        description="Skilled hands, patience and purpose — how a Lindway piece is actually made."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }, { name: "Our Production" }]}
        cta="Discover Now"
      />
      <ProductionTabs />
      <Container className="py-8">
        <PromoBanner
          title="Our Fabric Library"
          description="Premium fabrics chosen for comfort, quality and elegance."
          href="/about/our-fabrics"
          cta="Explore Fabrics"
          image={PLACEHOLDER_IMAGE}
        />
      </Container>
      <EverySnap />
    </>
  );
}
