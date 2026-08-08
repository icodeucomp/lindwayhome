import { ProductionTabs } from "@/components/ui/about";
import { EverySnap } from "@/components/ui";
import { PageHero, PromoBanner } from "@/components/ui/storefront";
import { Container } from "@/components";

export const metadata = { title: "Our Production — Lindway" };

export default function OurProductionPage() {
  return (
    <>
      <PageHero
        title="Our Production"
        description="Skilled hands, patience and purpose — how a Lindway piece is actually made."
        image="/images/about-lindway-header-artisan-journey.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }, { name: "Our Production" }]}
        cta="Discover Now"
      />
      <ProductionTabs />
      <Container className="py-8">
        <PromoBanner
          title="Our Fabric Library"
          description="Premium fabrics chosen for comfort, quality and elegance."
          href="/about/our-fabrics"
          cta="Explore Fabrics"
          image="/images/home-fabrics-characteristic-1.webp"
        />
      </Container>
      <EverySnap />
    </>
  );
}
