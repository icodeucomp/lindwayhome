"use client";

import { Container, Img } from "@/components";

import { Tabs } from "@/components/ui/storefront";

import { useDictionary } from "@/i18n/dictionary-provider";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Our Production" (reference/Our Production - Our Process.png and
 * Our Production - The Art Craftmanship.png — two tabs of one page, not two pages).
 *
 * The mockup's step copy is lorem ipsum, so the text below describes Lindway's actual
 * process as documented elsewhere in the site rather than inventing filler. Swap it for
 * the client's final copy when it arrives.
 */

type StepKey = keyof Dictionary["pages"]["ourProduction"]["steps"];

/** Order is the production sequence, so it is the design's rather than the data's. */
const STEPS: StepKey[] = ["design", "fabric", "cutting", "embellishment", "finishing", "packing"];

const craftGallery = [PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE];

export const ProductionTabs = () => {
  const t = useDictionary();
  const copy = t.pages.ourProduction;

  return (
    <Container id="content" className="py-14 scroll-mt-40">
      <Tabs
        items={[
          { key: "process", label: copy.tabs.process },
          { key: "craft", label: copy.tabs.craft },
        ]}
      >
        {(active) =>
          active === "process" ? (
            <div className="space-y-10">
              <p className="max-w-4xl text-lg leading-relaxed text-body">{copy.processIntro}</p>

              <div className="space-y-5">
                {STEPS.map((key, index) => (
                  <div key={key} className="grid items-stretch grid-cols-1 gap-0 lg:grid-cols-2">
                    <div className="flex items-center gap-6 p-8 bg-muted">
                      <span className="text-3xl font-heading text-primary/70">{String(index + 1).padStart(2, "0")}</span>
                      <div className="space-y-2">
                        <h3 className="text-lg font-heading text-primary">{copy.steps[key].title}</h3>
                        <p className="text-sm leading-relaxed text-body">{copy.steps[key].body}</p>
                      </div>
                    </div>
                    <Img src={PLACEHOLDER_IMAGE} alt={copy.steps[key].title} className="w-full min-h-56 bg-footer/30" cover />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              <p className="max-w-4xl text-lg leading-relaxed text-body">{copy.craftIntro}</p>

              {/* Staggered columns, matching the offset masonry in the mockup. */}
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
                {/* Keyed by position: the gallery is a fixed list that never reorders, and
                  nothing stops two slots holding the same image — they all do while
                  PLACEHOLDER_IMAGE stands in for the real photography. */}
                {craftGallery.map((image, index) => (
                  <Img key={index} src={image} alt={`${copy.craftImageAlt} ${index + 1}`} className={`w-full bg-footer/30 ${index % 3 === 1 ? "aspect-square lg:mt-16" : "aspect-4/5"}`} cover />
                ))}
              </div>
            </div>
          )
        }
      </Tabs>
    </Container>
  );
};
