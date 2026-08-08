import { Container } from "@/components";

import { PromoBanner } from "@/components/ui/storefront";

/** The paired call-outs under "Explore Our Collections". */
export const AtelierPromos = () => (
  <Container className="grid grid-cols-1 gap-5 py-8 lg:grid-cols-2">
    <PromoBanner
      title="Inside the Atelier"
      description="Every Lindway piece begins with skilled hands, patience, and purpose."
      href="/about/our-production"
      cta="Discover Our Process"
      image="/images/about-lindway-header-artisan-journey.webp"
    />
    <PromoBanner
      title="The Art of Craftmanship"
      description="Traditional techniques, modern expression, and timeless beauty"
      href="/about/our-fabrics"
      cta="Explore Fabrics"
      image="/images/home-fabrics-characteristic-2.webp"
    />
  </Container>
);

/** The full-width fabric call-out above the second value strip. */
export const FabricLibraryPromo = () => (
  <Container className="py-8">
    <PromoBanner
      title="Our Fabric Library"
      description="Premium fabrics chosen for comfort, quality and elegance."
      href="/about/our-fabrics"
      cta="Explore Fabrics"
      image="/images/home-fabrics-characteristic-1.webp"
    />
  </Container>
);
