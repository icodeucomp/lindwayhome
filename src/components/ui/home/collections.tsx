import { Container, Img, LocaleLink } from "@/components";

import { activeBrand } from "@/static/taxonomy";

import { ArrowLink, IMAGE_FALLBACK, SectionHeading } from "@/components/ui/storefront";

/**
 * "Explore Our Collections" (reference/Homepage - LIndway.png).
 *
 * Driven by `taxonomy.ts` (D25), so a brand that ships inactive — currently Studio
 * by Lindway and Lindway × AWP — simply does not appear, rather than linking to an
 * empty listing.
 */
export const Collections = () => {
  // Four, because the grid is four across and a fifth card would sit alone on a second
  // row. The mockup shows exactly four here and lists all five in the footer, so the
  // remainder is reachable without breaking the row.
  const brand = activeBrand().slice(0, 4);

  return (
    <Container className="py-16 space-y-8">
      <SectionHeading title="Explore Our Collections" description="From special moments to everyday elegance." />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {brand.map((entry) => (
          <article key={entry.key} className="space-y-3 group">
            <LocaleLink href={`/collections/${entry.slug}`} className="block overflow-hidden aspect-4/5 bg-footer/30" aria-label={entry.label}>
              <Img src={entry.image || IMAGE_FALLBACK} alt={entry.label} className="w-full h-full transition-transform duration-700 group-hover:scale-105" cover />
            </LocaleLink>

            <LocaleLink href={`/collections/${entry.slug}`} className="block text-lg transition-colors font-heading text-primary hover:text-body">
              {entry.label}
            </LocaleLink>

            <p className="text-sm text-body">{entry.description}</p>

            <ArrowLink href={`/collections/${entry.slug}`}>Shop Now</ArrowLink>
          </article>
        ))}
      </div>
    </Container>
  );
};
