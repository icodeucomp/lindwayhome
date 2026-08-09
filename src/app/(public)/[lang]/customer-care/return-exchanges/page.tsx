import { EverySnap, ReturnExchanges } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "Return & Exchanges — Lindway" };

export default function ReturnExchangesPage() {
  return (
    <>
      <PageHero
        title="Return & Exchanges"
        description="Clear and straightforward return and exchange terms for your peace of mind."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Return & Exchanges" }]}
        cta="Discover Now"
      />
      <ReturnExchanges />
      <EverySnap />
    </>
  );
}
