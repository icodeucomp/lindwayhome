import { Container, Img, LocaleLink } from "@/components";

import { activeBrand } from "@/static/taxonomy";

import { ArrowLink, IMAGE_FALLBACK, SectionHeading } from "@/components/ui/storefront";

/**
 * "Explore The Collection" — the band that closes every listing and product page
 * (reference/Collections Details.png, Product Details.png).
 *
 * Each brand carries its own image. It used to sit on one shared `<Background>` with
 * the labels laid over it, which read as a single grey field rather than five
 * collections — especially now that every brand falls back to the same placeholder.
 * The band is now a flat `muted` fill: with per-card artwork, a photograph behind the
 * photographs is just noise, and a light ground lets the images carry the contrast.
 *
 * `exclude` drops the brand the visitor is already looking at, so a collection page
 * never invites them back to itself.
 */

/**
 * Column span per card, on a 12-column grid.
 *
 * Five is the case that needs stating: 3 across, then 2 across, each filling its row —
 * rather than 4 across with a fifth stranded alone. Anything past five falls back to
 * four across and wraps, which is the only sane default for a count we do not have a
 * layout for. The classes are literal because Tailwind cannot see a name built at
 * runtime.
 */
const SPANS: Record<number, string> = {
  1: "lg:col-span-12",
  2: "lg:col-span-6",
  3: "lg:col-span-4",
  4: "lg:col-span-3",
};

const spanFor = (count: number, index: number) => (count === 5 ? (index < 3 ? "lg:col-span-4" : "lg:col-span-6") : (SPANS[count] ?? "lg:col-span-3"));

/**
 * Portrait when four cards share the row, landscape otherwise.
 *
 * Four across makes each card narrow, and a landscape crop in a narrow column leaves a
 * letterbox with almost no subject in it. This is the same 3:4 the Lindway Labels grid
 * on Our World uses, and for the same reason. The three- and five-card layouts give
 * each card at least a third of the width, where landscape reads better.
 */
const aspectFor = (count: number) => (count === 4 ? "aspect-3/4" : "aspect-4/3");

export const CollectionStrip = ({ exclude }: { exclude?: string }) => {
  const brand = activeBrand().filter((entry) => entry.key !== exclude);

  if (brand.length === 0) return null;

  return (
    <section className="py-8">
      <Container className="pb-8">
        <SectionHeading title="Explore The Collection" description="Thoughtfully designed collections for contemporary wear." />
      </Container>

      <div className="py-14 bg-muted">
        <Container className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-12">
          {brand.map((entry, index) => (
            <article key={entry.key} className={`space-y-3 group ${spanFor(brand.length, index)}`}>
              <LocaleLink href={`/collections/${entry.slug}`} className={`block overflow-hidden bg-footer/30 ${aspectFor(brand.length)}`} aria-label={entry.label}>
                <Img src={entry.image || IMAGE_FALLBACK} alt={entry.label} className="w-full h-full transition-transform duration-700 group-hover:scale-105" cover />
              </LocaleLink>

              <LocaleLink href={`/collections/${entry.slug}`} className="block text-xl font-heading text-primary">
                {entry.label}
              </LocaleLink>

              <p className="text-sm text-body/80">{entry.headline}</p>

              <ArrowLink href={`/collections/${entry.slug}`}>
                Explore
              </ArrowLink>
            </article>
          ))}
        </Container>
      </div>
    </section>
  );
};
