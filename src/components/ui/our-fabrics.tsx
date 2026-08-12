"use client";

import { Container, Img } from "@/components";

import { fabricsLists } from "@/static/our-fabrics";

import { AccordionItem } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Our Fabrics".
 *
 * Four blocks, in the order the design lays them out: the hero (from the page), a
 * single intro paragraph, the fabric accordion, and a 2×2 image grid to close.
 *
 * An earlier build carried three further sections — a four-across image row above the
 * accordion, paired "Crafted by Hand" / "Thoughtfully Sourced" columns, and a promo
 * banner. None of them appear in the design, so they are gone rather than pushed below
 * the fold; the copy for the two columns lives in git history if it is wanted back.
 *
 * The accordion opens on the first fabric, which is why `fabricsLists` is ordered
 * deliberately (cottons first) rather than alphabetically — see static/our-fabrics.ts.
 *
 * Stays static rather than becoming a table (D11).
 */
export const OurFabrics = () => (
  <>
    <Container id="content" className="pt-14 scroll-mt-40">
      <p className="max-w-5xl leading-relaxed text-body">
        At Lindway, fabric is more than just a material — it&apos;s the beginning of every story we tell. We choose each fabric with care to ensure it reflects the values of comfort, craftsmanship, and
        artistry that define our brand.
      </p>
    </Container>

    <Container className="py-12">
      {fabricsLists.map((fabric, index) => (
        <AccordionItem key={fabric.name} title={fabric.name.toUpperCase()} defaultOpen={index === 0}>
          <p className="leading-relaxed">{fabric.description}</p>
        </AccordionItem>
      ))}
    </Container>

    <Container className="grid grid-cols-1 gap-6 pb-20 sm:grid-cols-2">
      {[1, 2, 3, 4].map((index) => (
        <Img key={index} src={PLACEHOLDER_IMAGE} alt={`Lindway fabric ${index}`} className="w-full aspect-4/3 bg-footer/30" cover />
      ))}
    </Container>
  </>
);
