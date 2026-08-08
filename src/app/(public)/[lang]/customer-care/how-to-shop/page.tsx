import { EverySnap, HowToShop } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

export const metadata = { title: "How to Shop — Lindway" };

export default function HowToShopPage() {
  return (
    <>
      <PageHero
        title="How to Shop"
        description="At Lindway, we aim to make your shopping experience as seamless and personal as our designs."
        image="/images/how-to-shop-header-background.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "How to Shop" }]}
        cta="Discover Now"
      />
      <HowToShop />
      <EverySnap />
    </>
  );
}
