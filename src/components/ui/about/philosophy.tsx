"use client";

import * as React from "react";

import { Container, Img } from "@/components";

import { SectionHeading } from "@/components/ui/storefront";

import { useDictionary } from "@/i18n/dictionary-provider";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Our Philosophy" (reference/About Us.png).
 *
 * Vertical tabs rather than the horizontal `TabBar` in the kit — the mockup stacks the
 * three pillars down the left edge, and Lindway's philosophy has been "Custom.
 * Cultural. Conscious." since v1, so the three keys are fixed content, not data.
 */

type PillarKey = keyof Dictionary["pages"]["philosophy"]["pillars"];

/** Order is the design's; the copy lives in `pages.philosophy.pillars`. */
const PILLARS: PillarKey[] = ["custom", "cultural", "conscious"];

export const Philosophy = () => {
  const t = useDictionary();
  const copy = t.pages.philosophy;

  const [active, setActive] = React.useState<PillarKey>(PILLARS[0]);
  const current = copy.pillars[active];

  return (
    <Container className="py-16 space-y-8">
      <SectionHeading title={copy.heading} description={copy.subheading} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-4">
          {PILLARS.map((key) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(key)}
                className={`border px-6 py-5 text-left text-lg font-heading uppercase tracking-[0.12em] transition-colors ${
                  isActive ? "border-primary bg-primary text-light" : "border-primary/40 text-primary hover:bg-primary/5"
                }`}
              >
                {copy.pillars[key].label}
              </button>
            );
          })}
        </div>

        <Img src={PLACEHOLDER_IMAGE} alt={current.label} className="w-full aspect-3/4 bg-footer/30" cover />

        <p className="text-sm leading-relaxed text-body">{current.body}</p>
      </div>
    </Container>
  );
};
