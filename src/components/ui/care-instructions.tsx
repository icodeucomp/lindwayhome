import { Container } from "@/components";

import { FeatureCard, SectionHeading } from "@/components/ui/storefront";

import { PiDrop, PiSnowflake, PiHandSoap, PiHandsClapping, PiPaintBucket, PiWind, PiThermometer, PiProhibit, PiTShirt } from "react-icons/pi";

/**
 * "Care Instructions" (reference/Care Instructions.png).
 *
 * v1's bulleted list became a nine-card grid, one card per instruction, matching the
 * mockup. The instructions themselves are unchanged.
 */

const instructions = [
  { icon: <PiTShirt />, title: "Wash Before the First Wear", description: "Gently wash before first use to preserve comfort and freshness." },
  { icon: <PiDrop />, title: "Wash Inside Out", description: "Turn the garment inside out to help protect its color and surface." },
  { icon: <PiSnowflake />, title: "Gentle Cold Water", description: "Use cold water and a gentle cycle to maintain fabric quality." },
  { icon: <PiHandsClapping />, title: "Hand Wash Only", description: "Carefully hand wash to preserve the garment's craftsmanship." },
  { icon: <PiHandSoap />, title: "Avoid Detergents with Fragrances or Dyes", description: "Use mild detergent free from fragrances and dyes for better fabric care." },
  { icon: <PiPaintBucket />, title: "Do Not Bleach", description: "Avoid bleach to protect the fabric and maintain its original color." },
  { icon: <PiWind />, title: "Do Not Tumble Dry", description: "Air dry naturally to help retain the garment's shape and texture." },
  { icon: <PiThermometer />, title: "Warm Iron", description: "Use a warm iron when needed to keep the garment neat and refined." },
  { icon: <PiProhibit />, title: "Do Not Dry Clean", description: "Dry cleaning is not recommended for this garment." },
];

export const CareInstructions = () => (
  <Container id="content" className="py-16 space-y-8 scroll-mt-40">
    <SectionHeading title="Garment Care Instructions" description="Care that respects both your investment and the hands that made it." />

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {instructions.map((instruction) => (
        <FeatureCard key={instruction.title} item={instruction} />
      ))}
    </div>
  </Container>
);
