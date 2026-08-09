import { ShippingDelivery } from "@/components/ui/customer-care";
import { EverySnap } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "Shipping & Delivery — Lindway" };

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
