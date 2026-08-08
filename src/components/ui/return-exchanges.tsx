import { Container, Img } from "@/components";

import { PromoBanner, SectionHeading } from "@/components/ui/storefront";

/**
 * "Return & Exchanges" (reference/Return & Exchanges.png).
 *
 * The policy list became hairline-separated rows with an em-dash marker, matching the
 * mockup. Wording is unchanged from v1 — this is the legal copy, not decoration.
 */

const policies = ["All items are final sale, not eligible for return", "Non-refundable", "Non-modifiable", "Non-cashable", "Non-exchangeable", "Non-transferable"];

export const ReturnExchanges = () => (
  <>
    <Container id="content" className="grid grid-cols-1 gap-10 py-16 lg:grid-cols-2 scroll-mt-40">
      <div className="space-y-6">
        <SectionHeading title="Return and Exchanges Policies" />

        <ul className="list-none">
          {policies.map((policy) => (
            <li key={policy} className="flex items-baseline gap-4 py-4 border-b border-border">
              <span aria-hidden className="text-primary">
                &mdash;
              </span>
              <span className="text-lg text-primary">{policy}</span>
            </li>
          ))}
        </ul>
      </div>

      <Img src="/images/return-&-exchanges-policies-image.webp" alt="Lindway packaging" className="w-full aspect-4/5 bg-footer/30" cover />
    </Container>

    <Container className="pb-8">
      <p className="pb-8 text-base text-body">
        <strong className="font-heading">Special Conditions:</strong> Returned or exchanged may be provided; the items have to be in the same condition as when it is purchased. Items that include a bag
        must be returned with it.
      </p>

      <PromoBanner
        title="Learn How to Shop"
        description="From browsing to checkout, and where to reach us if you get stuck."
        href="/customer-care/how-to-shop"
        cta="Discover Now"
        image="/images/how-to-shop-header-background.webp"
      />
    </Container>
  </>
);
