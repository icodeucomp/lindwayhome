"use client";

import { Container, Img } from "@/components";

import { Tabs } from "@/components/ui/storefront";

/**
 * "Our Production" (reference/Our Production - Our Process.png and
 * Our Production - The Art Craftmanship.png — two tabs of one page, not two pages).
 *
 * The mockup's step copy is lorem ipsum, so the text below describes Lindway's actual
 * process as documented elsewhere in the site rather than inventing filler. Swap it for
 * the client's final copy when it arrives.
 */

const steps = [
  {
    title: "Design & Consultation",
    body: "Every piece starts on paper and, for made-to-order work, in conversation. Silhouette, motif and fabric are agreed before a single metre is cut, so nothing is decided after the fact.",
    image: "/images/how-to-shop-sample-photo-1.webp",
  },
  {
    title: "Fabric Selection",
    body: "Textiles are chosen for how they wear over years rather than seasons. We buy in quantities we can use, and what is left over is kept for patch work instead of discarded.",
    image: "/images/home-fabrics-characteristic-1.webp",
  },
  {
    title: "Cutting & Construction",
    body: "Patterns are cut by hand in our Denpasar atelier. Because runs are small, the same maker usually carries a garment from cut to finish — which is what keeps the fit consistent.",
    image: "/images/how-to-shop-sample-photo-2.webp",
  },
  {
    title: "Embellishment",
    body: "Hand-guided embroidery, hand-painted fabric, sequin work and batik are added by artisans trained in each technique. This is the slowest stage and the one we never compress.",
    image: "/images/about-lindway-header-artisan-journey.webp",
  },
  {
    title: "Finishing & Quality Check",
    body: "Seams, linings and closures are checked piece by piece. Anything that does not pass goes back to the maker rather than into the box.",
    image: "/images/how-to-shop-sample-photo-3.webp",
  },
  {
    title: "Packing & Dispatch",
    body: "Orders are wrapped and dispatched from Denpasar, with a tracking number sent as soon as the parcel is on its way.",
    image: "/images/how-to-shop-sample-photo-4.webp",
  },
];

const craftGallery = [
  "/images/about-lindway-header-artisan-journey.webp",
  "/images/home-fabrics-characteristic-1.webp",
  "/images/about-lindway-lindway-philosophy-kiri.webp",
  "/images/home-fabrics-characteristic-2.webp",
  "/images/about-lindway-lindway-philosophy-kanan.webp",
  "/images/home-conscious-initiatives-1.webp",
];

export const ProductionTabs = () => (
  <Container id="content" className="py-14 scroll-mt-40">
    <Tabs
      items={[
        { key: "process", label: "Our Process" },
        { key: "craft", label: "The Art Craftmanship" },
      ]}
    >
      {(active) =>
        active === "process" ? (
          <div className="space-y-10">
            <p className="max-w-4xl text-lg leading-relaxed text-body">
              Every Lindway piece begins with skilled hands, patience, and purpose—carefully crafted through time-honored techniques, thoughtful design, and an unwavering commitment to exceptional
              quality and lasting elegance.
            </p>

            <div className="space-y-5">
              {steps.map((step, index) => (
                <div key={step.title} className="grid items-stretch grid-cols-1 gap-0 lg:grid-cols-2">
                  <div className="flex items-center gap-6 p-8 bg-muted">
                    <span className="text-3xl font-heading text-primary/70">{String(index + 1).padStart(2, "0")}</span>
                    <div className="space-y-2">
                      <h3 className="text-lg font-heading text-primary">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-body">{step.body}</p>
                    </div>
                  </div>
                  <Img src={step.image} alt={step.title} className="w-full min-h-56 bg-footer/30" cover />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <p className="max-w-4xl text-lg leading-relaxed text-body">
              Traditional techniques, modern expression, and timeless beauty—each detail worked by an artisan who learned the craft here, in Bali.
            </p>

            {/* Staggered columns, matching the offset masonry in the mockup. */}
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
              {craftGallery.map((image, index) => (
                <Img key={image} src={image} alt={`Craftmanship ${index + 1}`} className={`w-full bg-footer/30 ${index % 3 === 1 ? "aspect-square lg:mt-16" : "aspect-4/5"}`} cover />
              ))}
            </div>
          </div>
        )
      }
    </Tabs>
  </Container>
);
