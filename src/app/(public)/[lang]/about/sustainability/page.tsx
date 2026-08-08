import { SustainabilityContent } from "@/components/ui/about";
import { EverySnap } from "@/components/ui";
import { careValues, FeatureStrip, PageHero } from "@/components/ui/storefront";

export const metadata = { title: "Sustainability — Lindway" };

export default function SustainabilityPage() {
  return (
    <>
      <PageHero
        title="Sustainability"
        description="Thoughtful materials, timeless craftsmanship, and pieces built to outlast a season."
        image="/images/home-conscious-initiatives-1.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }, { name: "Sustainability" }]}
        cta="Discover Now"
      />
      <SustainabilityContent />
      <FeatureStrip items={careValues} />
      <EverySnap />
    </>
  );
}
