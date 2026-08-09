import { Container, Img } from "@/components";

import { allValues, FeatureCard, PromoBanner, SectionHeading } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Why Choose Us?" and "Our Artisan Journey" (reference/About Us.png).
 *
 * The artisan copy is v1's `about/hero.tsx`, which the mockup reuses under a new
 * heading — so the text moves rather than being rewritten, and the old hero can go.
 */

const artisanParagraphs = [
  "At Lindway, every piece tells a story—of heritage, artistry, and heartfelt creation. Crafted with great care and love, our collections are brought to life through the hands of local artisans, each product embodying the essence of Indonesian tradition with a modern twist.",
  "From the refined beauty of manual and hand-guided embroidery to the expressive charm of hand-painted designs and the radiant sparkle of sequins, every Lindway creation is a tribute to traditional techniques.",
  "Our menswear line showcases the timeless elegance of contemporary style, ornament, and the rich tradition of Bali, interpreted by local artisans. These pieces offer a fresh, sophisticated expression of cultural heritage—blending tradition with modern sensibility.",
  "We embrace patch art using leftover materials, breathing new life into fabric remnants while committing to sustainability and honoring Indonesia's rich batik legacy.",
  "Comfort and craftsmanship go hand in hand in our collections. Every stitch, brushstroke, and detail is infused with passion and purpose. Step into our world and discover the quiet luxury of slow fashion—where each thread carries the soul of its maker.",
];

export const WhyChooseUs = () => (
  <Container className="py-16 space-y-8">
    <SectionHeading title="Why Choose Us?" />

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {allValues.map((value) => (
        <FeatureCard key={value.title} item={value} />
      ))}
    </div>
  </Container>
);

export const ArtisanJourney = () => (
  <Container id="artisan" className="py-16 space-y-8 scroll-mt-40">
    <SectionHeading title="Our Artisan Journey" />

    <div className="grid items-start grid-cols-1 gap-10 p-8 bg-muted lg:grid-cols-3">
      <Img src={PLACEHOLDER_IMAGE} alt="Lindway artisans at work" className="w-full aspect-3/4 bg-footer/30" cover />

      <div className="space-y-4 lg:col-span-2">
        <h3 className="text-2xl font-heading text-primary">A Celebration of Craftsmanship and Culture</h3>
        {artisanParagraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="text-sm leading-relaxed text-body">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  </Container>
);

export const SustainabilityPromo = () => (
  <Container className="py-8">
    <PromoBanner
      title="Discover Our Sustainability Principles"
      description="How we choose materials, treat offcuts, and pace production."
      href="/about/sustainability"
      cta="Discover Now"
      image={PLACEHOLDER_IMAGE}
    />
  </Container>
);
