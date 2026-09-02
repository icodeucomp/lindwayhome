/**
 * Structure for the Our World page (client wording document, 10 sections).
 *
 * Separate from `taxonomy.ts` on purpose. Taxonomy is the *data* axis — the enum keys
 * products are tagged with, the slugs the router resolves, the labels the shop filter
 * shows. This file is the *story*: which sections the page tells, in what order, and
 * where each one leads. Changing the narrative must not be able to break a route.
 *
 * The two meet only through `brandSlug`, which is looked up in taxonomy to build the
 * link — so a brand renamed there cannot leave a dead link here.
 *
 * ## Lindway × AWP
 *
 * The document is explicit that AWP is a collaboration, not a permanent label, and must
 * not sit beside the four labels. In the database it stays an ordinary `BrandType` —
 * products need a brand, and nothing about the schema changes. The distinction is made
 * here, in presentation: AWP is absent from `LABELS` and appears only as the featured
 * entry of the Collaborations section.
 */

/** A section of the page, in document order. The key indexes `pages.ourWorld.sections`. */
export interface WorldSection {
  key: string;
  /** Anchor id, so the opener and the header can link into the page. */
  id: string;
  /** Where the section's CTA leads. Internal paths are locale-prefixed by LocaleLink. */
  href: string;
}

export const WORLD_SECTIONS = [
  // §1 opens the page and hands the reader on to the first real section rather than
  // sending them off-site before they have read anything.
  { key: "opener", id: "content", href: "#craft" },
  { key: "craft", id: "craft", href: "/about/our-production" },
  { key: "artistry", id: "artistry", href: "/about" },
  { key: "labels", id: "labels", href: "/shop" },
  { key: "materials", id: "materials", href: "/about/our-fabrics" },
  // §6 is about real customers. Their photographs live on Instagram, not in our CMS,
  // so the link goes where the stories actually are rather than to a page we would
  // have to keep stocked by hand.
  { key: "stories", id: "stories", href: "instagram" },
  { key: "collaborations", id: "collaborations", href: "/collections/lindway-awp" },
  // §8 is the production philosophy, which is exactly what About's three pillars say.
  { key: "making", id: "making", href: "/about#philosophy" },
  { key: "journal", id: "journal", href: "/journal" },
  { key: "closing", id: "closing", href: "/shop" },
] as const satisfies readonly WorldSection[];

export type WorldSectionKey = (typeof WORLD_SECTIONS)[number]["key"];

/**
 * The four permanent labels, in document order.
 *
 * `brandSlug` is a taxonomy slug — the link is built from it, so this list cannot point
 * at a collection page that does not exist. AWP is deliberately not here.
 */
export const LABELS = [
  { key: "myLindway", brandSlug: "my-lindway" },
  { key: "simplyLindway", brandSlug: "simply-lindway" },
  { key: "lure", brandSlug: "lure-by-lindway" },
  { key: "studio", brandSlug: "studio-by-lindway" },
] as const;

export type LabelKey = (typeof LABELS)[number]["key"];

/** The featured collaboration of §7. A collaboration, never a label — see the note above. */
export const FEATURED_COLLABORATION = { key: "awp", brandSlug: "lindway-awp" } as const;
