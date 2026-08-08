import { EverySnap, ReturnExchanges } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

export const metadata = { title: "Return & Exchanges — Lindway" };

export default function ReturnExchangesPage() {
  return (
    <>
      <PageHero
        title="Return & Exchanges"
        description="Clear and straightforward return and exchange terms for your peace of mind."
        image="/images/return-&-exchanges-header-background.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Return & Exchanges" }]}
        cta="Discover Now"
      />
      <ReturnExchanges />
      <EverySnap />
    </>
  );
}
