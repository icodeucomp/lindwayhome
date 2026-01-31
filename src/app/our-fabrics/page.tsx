import { Footer, EverySnap, Hero, OurFabrics } from "@/components/ui";

export default function OurFabricsPage() {
  return (
    <main>
      <Hero
        title="Our Fabrics"
        description="At Lindway, fabric is more than just a material — it's the beginning of every story we tell. We choose each fabric with care to ensure it reflects the values of comfort, craftsmanship, and artistry that define our brand."
        imagePath="/images/our-fabric-header-background.webp"
      />
      <OurFabrics />
      <EverySnap />
      <Footer />
    </main>
  );
}
