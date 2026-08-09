import { Container } from "@/components";

import { FeatureCard, PromoBanner, SectionHeading } from "@/components/ui/storefront";

import { PiClock, PiGlobeHemisphereEast, PiMapPinLine, PiPackage, PiReceipt, PiTruck } from "react-icons/pi";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * "Shipping & Delivery".
 *
 * No mockup exists for this page, but it is linked from both the Customer Care menu and
 * the footer, so it cannot stay a placeholder. Composed from the kit using the shipping
 * copy that already appears verbatim on Product Details and How to Shop, so the three
 * pages state the same terms.
 */

const facts = [
  { icon: <PiClock />, title: "Processing Time", description: "Orders are processed within 1-3 business days." },
  { icon: <PiPackage />, title: "Made to Order", description: "Custom-made items may take 21-30 working days, depending on the complexity." },
  { icon: <PiMapPinLine />, title: "Across Indonesia", description: "We ship nationwide from our atelier in Denpasar, Bali." },
  { icon: <PiGlobeHemisphereEast />, title: "International", description: "International delivery is available on request — message us before ordering." },
  { icon: <PiReceipt />, title: "Tracking", description: "You'll receive a tracking number once your order is on its way." },
  { icon: <PiTruck />, title: "Shipping Cost", description: "Calculated at checkout from your delivery address and the parcel's size and weight." },
];

export const ShippingDelivery = () => (
  <>
    <Container id="content" className="py-16 space-y-8 scroll-mt-40">
      <SectionHeading title="Shipping & Delivery" description="How long your order takes, where we ship, and what happens after you pay." />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <FeatureCard key={fact.title} item={fact} />
        ))}
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-body">
        Shipping is calculated from the distance between our Denpasar atelier and your delivery address, together with the volumetric weight of the parcel. You will see the exact amount at checkout
        before you pay — we never add carriage charges afterwards.
      </p>
    </Container>

    <Container className="py-8">
      <PromoBanner
        title="Return & Exchanges"
        description="What can and cannot be returned, and under which conditions."
        href="/customer-care/return-exchanges"
        cta="Read the Policy"
        image={PLACEHOLDER_IMAGE}
      />
    </Container>
  </>
);
