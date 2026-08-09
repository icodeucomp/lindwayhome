"use client";

import { Container, Img } from "@/components";

import { fabricsLists } from "@/static/our-fabrics";

import { AccordionItem, PromoBanner, SectionHeading } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Our Fabrics" (reference/Our Fabric.png).
 *
 * The fabric list became an accordion — the mockup shows one open panel above a stack
 * of collapsed rows. Copy and the list itself are unchanged from v1's
 * `static/our-fabrics.ts`; only the presentation moved.
 *
 * Stays static rather than becoming a table (D11).
 */
export const OurFabrics = () => (
  <>
    <Container id="content" className="grid grid-cols-2 gap-4 pt-12 md:grid-cols-4 scroll-mt-40">
      {[1, 2, 3, 4].map((index) => (
        <Img key={index} src={`/images/our-fabric-category-image-${index}.webp`} alt={`Fabric ${index}`} className="w-full aspect-square bg-footer/30" cover />
      ))}
    </Container>

    <Container className="py-16 space-y-8">
      <SectionHeading title="The Fabric Library" description="Every textile we work with, and what it is best suited to." />

      <div>
        {fabricsLists.map((fabric, index) => (
          <AccordionItem key={fabric.name} title={fabric.name.toUpperCase()} defaultOpen={index === 0}>
            <p className="leading-relaxed">{fabric.description}</p>
          </AccordionItem>
        ))}
      </div>
    </Container>

    <Container className="grid grid-cols-1 gap-10 py-8 lg:grid-cols-2">
      <div className="space-y-4">
        <h3 className="text-2xl font-heading text-primary">Crafted by Hand</h3>
        <p className="text-sm leading-relaxed text-body">
          Our fabrics often become the canvas for traditional techniques like hand embroidery, hand-painting, and sequin work. Every detail is created by skilled artisans who bring life to each piece
          through time-honored craftsmanship.
        </p>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[1, 2, 3].map((index) => (
            <Img key={index} src={`/images/our-fabric-crafted-by-hand-image-${index}.webp`} alt={`Craft detail ${index}`} className="w-full aspect-3/4 bg-footer/30" cover />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-heading text-primary">Thoughtfully Sourced</h3>
        <p className="text-sm leading-relaxed text-body">
          We partner with local suppliers and small-scale producers to support ethical practices and celebrate Indonesian textile heritage. It&apos;s our way of ensuring quality — and preserving
          tradition — from the source.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[1, 2].map((index) => (
            <Img key={index} src={`/images/our-fabric-thoughtfully-image-${index}.webp`} alt={`Sourcing ${index}`} className="w-full aspect-3/4 bg-footer/30" cover />
          ))}
        </div>
      </div>
    </Container>

    <Container className="py-8">
      <PromoBanner
        title="Inside the Atelier"
        description="See how these fabrics become finished pieces."
        href="/about/our-production"
        cta="Discover Our Process"
        image={PLACEHOLDER_IMAGE}
      />
    </Container>
  </>
);
