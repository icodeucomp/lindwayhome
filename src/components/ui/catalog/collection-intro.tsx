import { Container, Img } from "@/components";

import { IMAGE_FALLBACK } from "@/components/ui/storefront";

import type { BrandingEntry } from "@/static/taxonomy";

/**
 * The copy-and-gallery block under a collection hero (reference/Collections Details.png).
 *
 * The mockup lays out four images in a 2×2 whose tiles are deliberately unequal — the
 * top-left is tall, the top-right short. Fewer than four images degrades gracefully
 * because the grid is defined by the tiles that exist, not by a fixed template.
 */
export const CollectionIntro = ({ entry }: { entry: BrandingEntry }) => {
  const gallery = entry.gallery.length > 0 ? entry.gallery : [IMAGE_FALLBACK];

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
        {gallery.slice(0, 4).map((image, index) => (
          <Img
            key={image}
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
