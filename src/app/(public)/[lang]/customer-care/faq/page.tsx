import { FaqContent } from "@/components/ui/customer-care";
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
  return localizedMetadata(lang, "/customer-care/faq", t.meta.faq);
}

export default function FaqPage() {
  return (
    <>
      <PageHero
        title="Frequently Asked Questions"
        description="Answers to what we are asked most — ordering, shipping, sizing and care."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "FAQ" }]}
        cta="Explore Now"
      />
      <FaqContent />
      <EverySnap />
    </>
  );
}
