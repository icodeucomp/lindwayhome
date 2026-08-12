import { Container, Img } from "@/components";

import { allValues, FeatureCard, PromoBanner, SectionHeading } from "@/components/ui/storefront";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Why Choose Us?" and "Our Artisan Journey" (reference/About Us.png).
 *
 * The artisan copy is v1's `about/hero.tsx`, which the mockup reuses under a new
 * heading — so the text moved rather than being rewritten, and the old hero is gone.
 */

const PARAGRAPHS = ["p1", "p2", "p3", "p4", "p5"] as const;

export const WhyChooseUs = ({ dictionary: t }: { dictionary: Dictionary }) => (
  <Container className="py-16 space-y-8">
    <SectionHeading title={t.pages.about.whyChooseUs.heading} />

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {allValues(t).map((value) => (
        <FeatureCard key={value.title} item={value} />
      ))}
    </div>
  </Container>
);

export const ArtisanJourney = ({ dictionary: t }: { dictionary: Dictionary }) => {
  const copy = t.pages.about.artisanJourney;

  return (
    <Container id="artisan" className="py-16 space-y-8 scroll-mt-40">
      <SectionHeading title={copy.heading} />

      <div className="grid items-start grid-cols-1 gap-10 p-8 bg-muted lg:grid-cols-3">
        <Img src={PLACEHOLDER_IMAGE} alt={copy.imageAlt} className="w-full aspect-3/4 bg-footer/30" cover />

        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-2xl font-heading text-primary">{copy.subheading}</h3>
          {PARAGRAPHS.map((key) => (
            <p key={key} className="text-sm leading-relaxed text-body">
              {copy[key]}
            </p>
          ))}
        </div>
      </div>
    </Container>
  );
};

export const SustainabilityPromo = ({ dictionary: t }: { dictionary: Dictionary }) => {
  const copy = t.pages.about.sustainabilityPromo;

  return (
    <Container className="py-8">
      <PromoBanner title={copy.title} description={copy.description} href="/about/sustainability" cta={copy.cta} image={PLACEHOLDER_IMAGE} />
    </Container>
  );
};
