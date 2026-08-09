import { CareInstructions, EverySnap } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "Care Instructions — Lindway" };

export default function CareInstructionsPage() {
  return (
    <>
      <PageHero
        title="Care Instructions"
        description="Keep your clothes fresh and long-lasting with care that respects both your investment and the environment."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Care Instructions" }]}
        cta="Discover Now"
      />
      <CareInstructions />
      <EverySnap />
    </>
  );
}
