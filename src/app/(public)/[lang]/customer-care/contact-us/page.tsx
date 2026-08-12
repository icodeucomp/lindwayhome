import { ContactContent } from "@/components/ui/customer-care";
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
  return localizedMetadata(lang, "/customer-care/contact-us", t.meta.contactUs);
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact Us"
        description="Our team is here to help. Leave us a message and we'll get back to you within 1–2 business days."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Contact Us" }]}
        cta="Get in Touch"
      />
      <ContactContent />
      <EverySnap />
    </>
  );
}
