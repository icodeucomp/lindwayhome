import { CareInstructions, EverySnap } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

export const metadata = { title: "Care Instructions — Lindway" };

export default function CareInstructionsPage() {
  return (
    <>
      <PageHero
        title="Care Instructions"
        description="Keep your clothes fresh and long-lasting with care that respects both your investment and the environment."
        image="/images/care-instructions-header-background.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Care Instructions" }]}
        cta="Discover Now"
      />
      <CareInstructions />
      <EverySnap />
    </>
  );
}
