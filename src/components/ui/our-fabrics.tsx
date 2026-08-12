"use client";

import { Container, Img } from "@/components";

import { fabricsLists } from "@/static/our-fabrics";

import { AccordionItem } from "@/components/ui/storefront";

import { useDictionary } from "@/i18n/dictionary-provider";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Our Fabrics".
 *
 * Three blocks in the order the design lays them out: an intro paragraph, the fabric
 * accordion, and a 2×2 image grid to close. The hero comes from the page.
 *
 * Fabric names stay in `static/our-fabrics.ts` and stay English (D2) — they are textile
 * names, not copy. The descriptions are in `pages.ourFabrics.fabrics`, keyed off the
 * same list so a fabric added in one place and forgotten in the other is a compile
 * error rather than an empty panel.
 *
 * An earlier build carried three further sections — a four-across image row above the
 * accordion, paired "Crafted by Hand" / "Thoughtfully Sourced" columns, and a promo
 * banner. None appear in the design; the copy for the two columns is in git history.
 */
export const OurFabrics = () => {
  const copy = useDictionary().pages.ourFabrics;

  return (
    <>
      <Container id="content" className="pt-14 scroll-mt-40">
        <p className="max-w-5xl leading-relaxed text-body">{copy.intro}</p>
      </Container>

      <Container className="py-12">
        {fabricsLists.map((fabric, index) => (
          <AccordionItem key={fabric.key} title={fabric.name.toUpperCase()} defaultOpen={index === 0}>
            <p className="leading-relaxed">{copy.fabrics[fabric.key]}</p>
          </AccordionItem>
        ))}
      </Container>

      <Container className="grid grid-cols-1 gap-6 pb-20 sm:grid-cols-2">
        {[1, 2, 3, 4].map((index) => (
          <Img key={index} src={PLACEHOLDER_IMAGE} alt={`${copy.imageAlt} ${index}`} className="w-full aspect-4/3 bg-footer/30" cover />
        ))}
      </Container>
    </>
  );
};
