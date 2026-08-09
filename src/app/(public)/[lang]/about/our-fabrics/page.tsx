import { EverySnap, OurFabrics } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "Our Fabrics — Lindway" };

export default function OurFabricsPage() {
  return (
    <>
      <PageHero
        title="Our Fabrics"
        description="At Lindway, fabric is more than just a material — it's the beginning of every story we tell."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }, { name: "Our Fabrics" }]}
        cta="Explore Fabrics"
      />
      <OurFabrics />
      <EverySnap />
    </>
  );
}
