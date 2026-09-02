import { Container, Img } from "@/components";

import { IMAGE_FALLBACK } from "@/components/ui/storefront";

import type { BrandEntry } from "@/static/taxonomy";

/** The layout is a fixed four-tile composition, not a list — see the note below. */
const GALLERY_SLOTS = 4;

/**
 * The copy-and-gallery block under a collection hero (reference/Collections Details.png).
 *
 * The mockup lays out four images in a 2×2 whose tiles are deliberately unequal — the
 * top-left is tall, the top-right short.
 *
 * The four slots are always rendered. An earlier version fell back to a single image
 * when a brand had no gallery, which left Studio by Lindway and Lindway × AWP — the two
 * still waiting on photography — looking like a different page from the other three.
 * Padding keeps the block one shape for every brand, and the padding disappears on its
 * own as real images arrive.
 */
export const CollectionIntro = ({ entry }: { entry: BrandEntry }) => {
  const gallery = Array.from({ length: GALLERY_SLOTS }, (_, index) => entry.gallery[index] || IMAGE_FALLBACK);

  return (
    <Container className="grid items-center grid-cols-1 gap-12 py-16 lg:grid-cols-2">
      <div className="space-y-4">
        <h2 className="text-3xl font-heading text-primary">{entry.label}</h2>
        <p className="text-lg font-heading text-primary/85">{entry.tagline}</p>
        {entry.body.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="text-sm leading-relaxed text-body">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Keyed by position, not by URL: the gallery is a fixed four-slot layout that
            never reorders, and two slots may legitimately hold the same image — as they
            all do while PLACEHOLDER_IMAGE stands in for the client's photography. */}
        {gallery.map((image, index) => (
          <Img
            key={index}
            src={image}
            alt={`${entry.label} ${index + 1}`}
            className={`w-full bg-footer/30 ${index === 0 ? "aspect-3/4" : index === 1 ? "aspect-square self-end" : "aspect-4/5"}`}
            cover
          />
        ))}
      </div>
    </Container>
  );
};
