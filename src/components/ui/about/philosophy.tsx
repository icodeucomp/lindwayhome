"use client";

import * as React from "react";

import { Container, Img } from "@/components";

import { SectionHeading } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Our Philosophy" (reference/About Us.png).
 *
 * Vertical tabs rather than the horizontal `TabBar` in the kit — the mockup stacks the
 * three pillars down the left edge, and Lindway's philosophy has been "Custom.
 * Cultural. Conscious." since v1, so the three keys are fixed content, not data.
 */

const pillars = [
  {
    key: "custom",
    label: "Custom",
    image: PLACEHOLDER_IMAGE,
    body: "Most of what we make begins as a conversation. Measurements, motifs, a colour someone remembers from a ceremony — our made-to-order pieces are cut for one person rather than for a size chart. It is slower, and that is the point: nothing leaves the atelier until it fits the person who asked for it.",
  },
  {
    key: "cultural",
    label: "Cultural",
    image: PLACEHOLDER_IMAGE,
    body: "Every technique we use — hand-guided embroidery, hand-painted fabric, sequin work, batik — is Indonesian, and is worked by artisans who learned it here. We treat those traditions as living craft rather than decoration, which means paying properly for the time they take and naming the hands that do them.",
  },
  {
    key: "conscious",
    label: "Conscious",
    image: PLACEHOLDER_IMAGE,
    body: "We produce in small runs, choose fabrics that outlast a season, and turn offcuts into patch art rather than waste. Fashion with intention means accounting for what a garment costs the community and the island it was made on, not only what it costs to buy.",
  },
];

export const Philosophy = () => {
  const [active, setActive] = React.useState(pillars[0].key);
  const current = pillars.find((pillar) => pillar.key === active) ?? pillars[0];

  return (
    <Container className="py-16 space-y-8">
      <SectionHeading title="Our Philosophy" description="Custom. Cultural. Conscious." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-4">
          {pillars.map((pillar) => {
            const isActive = pillar.key === active;
            return (
              <button
                key={pillar.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(pillar.key)}
                className={`border px-6 py-5 text-left text-lg font-heading uppercase tracking-[0.12em] transition-colors ${
                  isActive ? "border-primary bg-primary text-light" : "border-primary/40 text-primary hover:bg-primary/5"
                }`}
              >
                {pillar.label}
              </button>
            );
          })}
        </div>

        <Img src={current.image} alt={current.label} className="w-full aspect-3/4 bg-footer/30" cover />

        <p className="text-sm leading-relaxed text-body">{current.body}</p>
      </div>
    </Container>
  );
};
