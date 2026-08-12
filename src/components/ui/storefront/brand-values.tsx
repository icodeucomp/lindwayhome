import { PiCertificate, PiFlowerLotus, PiHandHeart, PiHeadset, PiScissors, PiSealCheck, PiSwatches, PiTruck, PiUsersThree } from "react-icons/pi";

import type { Dictionary } from "@/i18n/get-dictionary";

import type { Feature } from "./ui";

/**
 * The nine brand promises. They appear as two strips on the homepage and as the
 * complete "Why Choose Us?" grid on About (reference/Homepage, About Us.png), so they
 * are declared once and sliced rather than retyped per page.
 *
 * Only the icon lives here; the wording is in `pages.brandValues`. Each export is a
 * function of the dictionary rather than a ready-made array, because a module-level
 * array would freeze whichever locale imported it first — and these are imported by
 * pages in both languages within the same process.
 */

type ValueKey = keyof Dictionary["pages"]["brandValues"];

const ICONS: Record<ValueKey, React.ReactNode> = {
  handcrafted: <PiScissors />,
  premiumFabrics: <PiSwatches />,
  madeToOrder: <PiCertificate />,
  timelessDesign: <PiFlowerLotus />,
  worldwideShipping: <PiTruck />,
  sustainableFashion: <PiHandHeart />,
  ethicalProduction: <PiUsersThree />,
  exclusiveDesign: <PiSealCheck />,
  customerCare: <PiHeadset />,
};

const resolve = (t: Dictionary, keys: readonly ValueKey[]): Feature[] => keys.map((key) => ({ icon: ICONS[key], ...t.pages.brandValues[key] }));

/** Under the homepage hero. */
export const craftValues = (t: Dictionary) => resolve(t, ["handcrafted", "premiumFabrics", "madeToOrder", "timelessDesign", "worldwideShipping"]);

/** Above "Seen With Lindway". */
export const careValues = (t: Dictionary) => resolve(t, ["sustainableFashion", "ethicalProduction", "exclusiveDesign", "customerCare"]);

/** About "Why Choose Us?" — column order in the mockup, not the declaration order. */
export const allValues = (t: Dictionary) =>
  resolve(t, ["handcrafted", "timelessDesign", "ethicalProduction", "premiumFabrics", "worldwideShipping", "exclusiveDesign", "madeToOrder", "sustainableFashion", "customerCare"]);
