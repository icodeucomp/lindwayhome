import { SizeGuideContent } from "@/components/ui/customer-care";
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
  return localizedMetadata(lang, "/customer-care/size-guide", t.meta.sizeGuide);
}

export default function SizeGuidePage() {
  return (
    <>
      <PageHero
        title="Size Guide"
        description="Find the size that fits you best — or ask us for a custom fit."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Size Guide" }]}
        cta="Discover Now"
      />
      <SizeGuideContent />
      <EverySnap />
    </>
  );
}
