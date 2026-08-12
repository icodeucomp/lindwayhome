/**
 * The fabric library shown as an accordion on /about/our-fabrics.
 *
 * Names only. The descriptions live in `pages.ourFabrics.fabrics` so they can be
 * translated; the names themselves are not — "Cotton Voile" and "Brocade" are textile
 * names that read the same in both languages, the same reasoning that keeps brand and
 * clothing labels English (D2).
 *
 * Ordered to match the design, not alphabetically: the cottons lead as a family, then
 * the lighter weaves, then the two structured fabrics. The component opens the first
 * entry by default, so the order decides which fabric a visitor reads first.
 */

import type { Dictionary } from "@/i18n/get-dictionary";

export type FabricKey = keyof Dictionary["pages"]["ourFabrics"]["fabrics"];

export const fabricsLists: { key: FabricKey; name: string }[] = [
  { key: "cotton", name: "Cotton" },
  { key: "cottonVoile", name: "Cotton Voile" },
  { key: "cottonLining", name: "Cotton Lining" },
  { key: "cottonViscose", name: "Cotton Viscose" },
  { key: "sifon", name: "Sifon" },
  { key: "linenCotton", name: "Linen Cotton" },
  { key: "organzaSemiSilk", name: "Organza Semi Silk Premium (soft)" },
  { key: "brocade", name: "Brocade" },
  { key: "jacquard", name: "Jacquard" },
];
