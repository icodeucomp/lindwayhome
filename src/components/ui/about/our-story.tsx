import { Container, Img } from "@/components";

import { SectionHeading } from "@/components/ui/storefront";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Our Story" (reference/About Us.png).
 *
 * The four paragraphs are numbered keys rather than an array: they are laid out in a
 * two-column grid, so their order is part of the design, and a key that goes missing
 * should be a compile error rather than a silently shorter column.
 */

const PARAGRAPHS = ["p1", "p2", "p3", "p4"] as const;

export const OurStory = ({ dictionary: t }: { dictionary: Dictionary }) => {
  const copy = t.pages.about.ourStory;

  return (
    <Container id="content" className="grid items-start grid-cols-1 gap-10 py-16 lg:grid-cols-3 scroll-mt-40">
      <Img src={PLACEHOLDER_IMAGE} alt={copy.imageAlt} className="w-full aspect-3/4 bg-footer/30" cover />

      <div className="space-y-6 lg:col-span-2">
        <SectionHeading title={copy.heading} description={copy.subheading} />

        <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
          {PARAGRAPHS.map((key) => (
            <p key={key} className="text-sm leading-relaxed text-body">
              {copy[key]}
            </p>
          ))}
        </div>

        <p className="text-sm italic text-body/80">{copy.closing}</p>
      </div>
    </Container>
  );
};
