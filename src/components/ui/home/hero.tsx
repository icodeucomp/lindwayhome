import { Background, Container } from "@/components";

import { Eyebrow, StoreLinkButton } from "@/components/ui/storefront";

/**
 * Homepage hero (reference/Homepage - LIndway.png).
 *
 * The mockup shows the copy on the left of a full-width band with the image to its
 * right; with real photography that reads as one full-bleed image with the copy over
 * its left third, so the scrim runs left-to-right rather than dimming the whole frame.
 */
export const Hero = () => (
  <Background src="/images/home-header-background.webp" alt="Lindway hero" parentClassName="shadow-none" className="flex items-center min-h-150" imgClassName="object-right">
    <div className="absolute inset-0 bg-linear-to-r from-light via-light/85 to-light/10" />

    <Container className="relative py-20">
      <div className="max-w-xl space-y-6">
        <Eyebrow className="tracking-[0.22em]">Timeless. Thoughtful. Artisanal</Eyebrow>

        <h1 className="text-4xl leading-tight font-heading text-primary sm:text-5xl">
          Where Heritage
          <br />
          Meets Modern Grace
        </h1>

        <p className="max-w-lg text-sm text-body sm:text-base">Luxury kebaya, contemporary Balinese fashion, crochet resort wear and artisanal family clothing handcrafted in Bali, Indonesia.</p>

        <div className="flex flex-wrap gap-4 pt-2">
          <StoreLinkButton href="/collections/my-lindway">Explore Collections</StoreLinkButton>
          <StoreLinkButton href="/about" variant="outline">
            Our Story
          </StoreLinkButton>
        </div>
      </div>
    </Container>
  </Background>
);
