import { SustainabilityContent } from "@/components/ui/about";
import { EverySnap } from "@/components/ui";
import { careValues, FeatureStrip, PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "Sustainability — Lindway" };

export default function SustainabilityPage() {
  return (
    <>
      <PageHero
        title="Sustainability"
        description="Thoughtful materials, timeless craftsmanship, and pieces built to outlast a season."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }, { name: "Sustainability" }]}
        cta="Discover Now"
      />
      <SustainabilityContent />
      <FeatureStrip items={careValues} />
      <EverySnap />
    </>
  );
}
