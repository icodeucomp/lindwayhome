import { SizeGuideContent } from "@/components/ui/customer-care";
import { EverySnap } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "Size Guide — Lindway" };

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
