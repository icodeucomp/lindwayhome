import { Container, Img } from "@/components";

import { SectionHeading } from "@/components/ui/storefront";

/**
 * "Our Story" (reference/About Us.png).
 *
 * Copy carried over verbatim from v1's `about-us.tsx` — the mockup's heading and
 * subheading match it word for word, so this is a restyle rather than a rewrite.
 */

const paragraphs = [
  "Lindway is more than a brand—it's a lifestyle shaped by passion, purpose, and the vibrant soul of Bali. Based in Denpasar and proudly self-manufactured, Lindway is built by the hands of local artisans, blending creativity and community into every thread.",
  "Our vision is to express beauty through thoughtful design—where color, pattern, texture, and form come together in refined harmony. Each creation is a reflection of our commitment to elegance, craftsmanship, and authentic storytelling.",
  "We believe in fashion with intention. That means producing high-quality pieces that not only elevate personal style but also make a positive impact on our community, our environment, and the planet. Every product is made with care—thoughtfully designed, responsibly crafted, and tailored to meet both aesthetic and ethical standards.",
  "At Lindway, fabric is treated as both material and muse. We carefully select only the finest textiles and ensure minimal waste by thoughtfully repurposing leftover fabric across our collections. It's a quiet nod to sustainability—woven into the essence of our brand.",
];

export const OurStory = () => (
  <Container id="content" className="grid items-start grid-cols-1 gap-10 py-16 lg:grid-cols-3 scroll-mt-40">
    <Img src="/images/about-lindway-lindway-philosophy-kiri.webp" alt="Lindway atelier in Denpasar" className="w-full aspect-3/4 bg-footer/30" cover />

    <div className="space-y-6 lg:col-span-2">
      <SectionHeading title="Our Story" description="Rooted in Bali, Inspired by Purpose" />

      <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="text-sm leading-relaxed text-body">
            {paragraph}
          </p>
        ))}
      </div>

      <p className="text-sm italic text-body/80">With every piece, Lindway invites you to experience fashion that feels meaningful, mindful, and timeless.</p>
    </div>
  </Container>
);
