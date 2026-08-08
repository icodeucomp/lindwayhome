import { Container, Img } from "@/components";

import { socialLinks } from "@/static/navigation";

import { SectionHeading } from "@/components/ui/storefront";

/**
 * "Seen With Lindway" (reference/Homepage - LIndway.png).
 *
 * Replaces v1's "Style & Heritage in Every Snap" strip. Still a hardcoded set of
 * photographs — there is no UGC model in the schema and none is planned, so these are
 * curated by deploy the way `taxonomy.ts` hero art is.
 */

const snaps = [
  { image: "/images/customer-moment-photo-1.webp", href: socialLinks.instagram },
  { image: "/images/customer-moment-photo-2.webp", href: socialLinks.instagram },
  { image: "/images/customer-moment-photo-3.webp", href: socialLinks.instagram },
  { image: "/images/customer-moment-photo-4.webp", href: socialLinks.instagram },
];

export const EverySnap = () => (
  <Container className="py-16 space-y-8">
    <SectionHeading title="Seen With Lindway" description="Real moments, real stories, beautifully Lindway." />

    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      {snaps.map((snap, index) => (
        <a key={snap.image} href={snap.href} target="_blank" rel="noopener noreferrer" className="relative block overflow-hidden group aspect-4/5 bg-footer/30">
          <Img src={snap.image} alt={`Lindway customer moment ${index + 1}`} className="w-full h-full transition-transform duration-700 group-hover:scale-105" cover />
          <span className="absolute px-5 py-2.5 text-xs -translate-x-1/2 bottom-5 left-1/2 bg-primary text-light font-heading uppercase tracking-[0.14em] whitespace-nowrap">Explore More</span>
        </a>
      ))}
    </div>
  </Container>
);
