import { Background, Container } from "@/components";

import { activeBrand } from "@/static/taxonomy";

import { ArrowLink, IMAGE_FALLBACK, SectionHeading } from "@/components/ui/storefront";

import { LocaleLink } from "@/components";

/**
 * "Explore The Collection" — the dark full-bleed band that closes every listing and
 * product page (reference/Collections Details.png, Product Details.png).
 *
 * `exclude` drops the brand the visitor is already looking at, so a collection page
 * never invites them back to itself.
 */
export const CollectionStrip = ({ exclude }: { exclude?: string }) => {
  const brand = activeBrand().filter((entry) => entry.key !== exclude);

  if (brand.length === 0) return null;

  return (
    <section className="py-8">
      <Container className="pb-8">
        <SectionHeading title="Explore The Collection" description="Thoughtfully designed collections for contemporary wear." />
      </Container>

      <Background src={IMAGE_FALLBACK} alt="" parentClassName="shadow-none" className="py-16" imgClassName="brightness-[0.6]">
        <Container className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {brand.map((entry) => (
            <div key={entry.key} className="space-y-3">
              <LocaleLink href={`/collections/${entry.slug}`} className="block text-xl font-heading text-light hover:underline underline-offset-4">
                {entry.label}
              </LocaleLink>
              <p className="text-sm text-light/85">{entry.headline}</p>
              <ArrowLink href={`/collections/${entry.slug}`} className="text-light">
                Explore
              </ArrowLink>
            </div>
          ))}
        </Container>
      </Background>
    </section>
  );
};
