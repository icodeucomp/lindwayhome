import { ShippingDelivery } from "@/components/ui/customer-care";
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
  return localizedMetadata(lang, "/customer-care/shipping-delivery", t.meta.shippingDelivery);
}

export default function ShippingDeliveryPage() {
  return (
    <>
      <PageHero
        title="Shipping & Delivery"
        description="How long your order takes, where we ship, and what happens after you pay."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Shipping & Delivery" }]}
        cta="Discover Now"
      />
      <ShippingDelivery />
      <EverySnap />
    </>
  );
}
