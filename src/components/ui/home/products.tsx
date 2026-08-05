import { Container, Img, LocaleLink, Motion } from "@/components";

import { activeBranding } from "@/static/taxonomy";

/**
 * The product grid that used to sit above these blocks was removed with
 * `card-product.tsx` — it read `Product.name`, `category` and `productionNotes`,
 * none of which exist in the v2 model. Phase 2 rebuilds it against
 * ProductTranslation + the taxonomy enums.
 *
 * The branding blocks below survive because they are already correct for v2: their
 * label, subheadline, image and slug now come from `taxonomy.ts` (D25) rather than
 * being hardcoded three times.
 */
export const Products = () => {
  const branding = activeBranding();

  return (
    <Container className="space-y-16 py-14 md:py-16">
      <div className="space-y-4 sm:space-y-8 text-body">
        <Motion tag="h2" initialY={50} animateY={0} duration={0.2} className="text-center heading">
          Discover the World of Lindway
        </Motion>
        <Motion tag="p" initialY={50} animateY={0} duration={0.2} className="max-w-5xl mx-auto text-sm text-center sm:text-base">
          Lindway is the parent house of distinctive brands—each with a unique story, yet united by a shared commitment to craftsmanship, cultural heritage, and design excellence.
        </Motion>
      </div>

      <div className="space-y-8">
        {branding.map((entry, index) => {
          const imageFirst = index % 2 === 0;
          const image = <Img src={entry.image} alt={`${entry.label} image`} className="w-full max-w-2xl min-h-72 sm:min-h-80" position="top" cover />;

          return (
            <Motion
              key={entry.key}
              tag="div"
              initialY={50}
              animateY={0}
              duration={0.2}
              delay={index * 0.1}
              className={`flex items-center gap-2 sm:gap-4 ${imageFirst ? "flex-col sm:flex-row" : "flex-col-reverse sm:flex-row"}`}
            >
              {imageFirst && image}
              <div className="w-full space-y-1 text-center sm:space-y-2 text-body">
                <h4 className="text-xl font-semibold sm:text-2xl font-heading">{entry.label}</h4>
                <p className="text-base font-light sm:text-lg">{entry.description}</p>
                <LocaleLink href={`/collections/${entry.slug}`} className="block p-1 mx-auto text-xs font-medium border-b sm:p-2 sm:text-sm border-primary text-primary w-max">
                  Discover Collection
                </LocaleLink>
              </div>
              {!imageFirst && image}
            </Motion>
          );
        })}
      </div>
    </Container>
  );
};
