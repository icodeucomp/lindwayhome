import { SizeGuideContent } from "@/components/ui/customer-care";
import { EverySnap } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

export const metadata = { title: "Size Guide — Lindway" };

export default function SizeGuidePage() {
  return (
    <>
      <PageHero
        title="Size Guide"
        description="Find the size that fits you best — or ask us for a custom fit."
        image="/images/how-to-shop-header-background.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Size Guide" }]}
        cta="Discover Now"
      />
      <SizeGuideContent />
      <EverySnap />
    </>
  );
}
