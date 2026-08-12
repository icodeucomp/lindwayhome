import { Container } from "@/components";

import { FeatureCard, PromoBanner, SectionHeading } from "@/components/ui/storefront";

import type { Dictionary } from "@/i18n/get-dictionary";

import { PiClock, PiGlobeHemisphereEast, PiMapPinLine, PiPackage, PiReceipt, PiTruck } from "react-icons/pi";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Shipping & Delivery".
 *
 * No mockup exists for this page, but it is linked from both the Customer Care menu and
 * the footer, so it cannot stay a placeholder. Composed from the kit using the shipping
 * copy that already appears on Product Details and How to Shop, so the three pages state
 * the same terms — see `product_defaults.default_shipping_delivery` in the seed.
 */

type FactKey = keyof Dictionary["pages"]["shippingDelivery"]["items"];

const facts: { key: FactKey; icon: React.ReactNode }[] = [
  { key: "processingTime", icon: <PiClock /> },
  { key: "madeToOrder", icon: <PiPackage /> },
  { key: "acrossIndonesia", icon: <PiMapPinLine /> },
  { key: "international", icon: <PiGlobeHemisphereEast /> },
  { key: "tracking", icon: <PiReceipt /> },
  { key: "shippingCost", icon: <PiTruck /> },
];

export const ShippingDelivery = ({ dictionary: t }: { dictionary: Dictionary }) => {
  const copy = t.pages.shippingDelivery;

  return (
    <>
      <Container id="content" className="py-16 space-y-8 scroll-mt-40">
        <SectionHeading title={copy.heading} description={copy.headingDescription} />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <FeatureCard key={fact.key} item={{ icon: fact.icon, ...copy.items[fact.key] }} />
          ))}
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-body">{copy.note}</p>
      </Container>

      <Container className="py-8">
        <PromoBanner title={copy.promo.title} description={copy.promo.description} href="/customer-care/return-exchanges" cta={copy.promo.cta} image={PLACEHOLDER_IMAGE} />
      </Container>
    </>
  );
};
