import { PiCertificate, PiFlowerLotus, PiHandHeart, PiHeadset, PiScissors, PiSealCheck, PiSwatches, PiTruck, PiUsersThree } from "react-icons/pi";

import type { Feature } from "./ui";

/**
 * The nine brand promises. They appear as two strips on the homepage and as the
 * complete "Why Choose Us?" grid on About (reference/Homepage, About Us.png), so they
 * are declared once and sliced rather than retyped per page.
 */
const values = {
  handcrafted: { icon: <PiScissors />, title: "Handcrafted", description: "By local artisans in Bali" },
  premiumFabrics: { icon: <PiSwatches />, title: "Premium Fabrics", description: "Carefully selected for comfort & beauty" },
  madeToOrder: { icon: <PiCertificate />, title: "Made to Order", description: "Just for you" },
  timelessDesign: { icon: <PiFlowerLotus />, title: "Timeless Design", description: "Made to be loved today and forever" },
  worldwideShipping: { icon: <PiTruck />, title: "Worldwide Shipping", description: "Delivering joy to your door, wherever you are." },
  sustainableFashion: { icon: <PiHandHeart />, title: "Sustainable Fashion", description: "Thoughtful choices for a better tomorrow" },
  ethicalProduction: { icon: <PiUsersThree />, title: "Ethical Production", description: "Supporting local artisans and preserving heritage" },
  exclusiveDesign: { icon: <PiSealCheck />, title: "Exclusive Design", description: "Created in our Bali atelier" },
  customerCare: { icon: <PiHeadset />, title: "Customer Care", description: "We are here to help you" },
} satisfies Record<string, Feature>;

/** Under the homepage hero. */
export const craftValues: Feature[] = [values.handcrafted, values.premiumFabrics, values.madeToOrder, values.timelessDesign, values.worldwideShipping];

/** Above "Seen With Lindway". */
export const careValues: Feature[] = [values.sustainableFashion, values.ethicalProduction, values.exclusiveDesign, values.customerCare];

/** About "Why Choose Us?" — column order in the mockup, not the declaration order. */
export const allValues: Feature[] = [
  values.handcrafted,
  values.timelessDesign,
  values.ethicalProduction,
  values.premiumFabrics,
  values.worldwideShipping,
  values.exclusiveDesign,
  values.madeToOrder,
  values.sustainableFashion,
  values.customerCare,
];
