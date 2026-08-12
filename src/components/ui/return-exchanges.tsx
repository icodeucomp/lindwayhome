import { Container, Img } from "@/components";

import { PromoBanner, SectionHeading } from "@/components/ui/storefront";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Return & Exchanges" (reference/Return & Exchanges.png).
 *
 * The policy list is hairline-separated rows with an em-dash marker, matching the
 * mockup. This is legal copy rather than decoration, so the Indonesian wording tracks
 * `product_defaults.default_return_policy` in the seed — a buyer must not be able to
 * read one set of terms on the product page and a different set here.
 */

const POLICY_KEYS = ["finalSale", "nonRefundable", "nonModifiable", "nonCashable", "nonExchangeable", "nonTransferable"] as const;

export const ReturnExchanges = ({ dictionary: t }: { dictionary: Dictionary }) => {
  const copy = t.pages.returnExchanges;

  return (
    <>
      <Container id="content" className="grid grid-cols-1 gap-10 py-16 lg:grid-cols-2 scroll-mt-40">
        <div className="space-y-6">
          <SectionHeading title={copy.heading} />

          <ul className="list-none">
            {POLICY_KEYS.map((key) => (
              <li key={key} className="flex items-baseline gap-4 py-4 border-b border-border">
                <span aria-hidden className="text-primary">
                  &mdash;
                </span>
                <span className="text-lg text-primary">{copy.policies[key]}</span>
              </li>
            ))}
          </ul>
        </div>

        <Img src={PLACEHOLDER_IMAGE} alt={copy.imageAlt} className="w-full aspect-4/5 bg-footer/30" cover />
      </Container>

      <Container className="pb-8">
        <p className="pb-8 text-base text-body">
          <strong className="font-heading">{copy.specialConditionsLabel}</strong> {copy.specialConditions}
        </p>

        <PromoBanner title={copy.promo.title} description={copy.promo.description} href="/customer-care/how-to-shop" cta={copy.promo.cta} image={PLACEHOLDER_IMAGE} />
      </Container>
    </>
  );
};
