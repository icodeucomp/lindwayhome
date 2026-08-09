import { ArtisanJourney, OurStory, Philosophy, SustainabilityPromo, WhyChooseUs } from "@/components/ui/about";
import { EverySnap } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = {
  title: "About Us — Lindway",
  description: "Rooted in Bali, inspired by purpose. The story, philosophy and artisans behind Lindway.",
};

/**
 * About is a single page (reference/About Us.png), not the five separate routes §B2.1
 * sketched. Our Story and Our Artisan are sections here; Our Production, Sustainability
 * and Our Fabrics keep their own routes because they have their own mockups.
 */
export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About Us"
        description="A house of artisanal fashion, built in Denpasar by the hands of local craftspeople."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }]}
        cta="Explore Now"
      />
      <OurStory />
      <Philosophy />
      <WhyChooseUs />
      <ArtisanJourney />
      <SustainabilityPromo />
      <EverySnap />
    </>
  );
}
