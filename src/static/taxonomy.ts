/**
 * Canonical taxonomy display data (CLAUDE.md D25).
 *
 * Branding, audience and garment are Prisma enums, so the database stores only the
 * key. Everything a page needs to render — label, URL slug, hero copy, hero image,
 * menu order — lives here.
 *
 * Consequences to keep in mind:
 *   · Adding a branding, audience or garment means editing the Prisma enum, running
 *     a migration, editing this file, and deploying. There is no admin screen.
 *   · `isActive: false` hides an entry from the navigation and its listing without
 *     removing the enum value, so products already tagged with it are never orphaned.
 *   · Labels are intentionally NOT translated (D2) — brand and category names read
 *     the same in both languages.
 */

import type { $Enums } from "prisma-client/client";

export type BrandingType = $Enums.BrandingType;
export type AudienceType = $Enums.AudienceType;
export type GarmentType = $Enums.GarmentType;

export interface TaxonomyEntry<T extends string> {
  key: T;
  label: string;
  slug: string;
  order: number;
  isActive: boolean;
}

export interface BrandingEntry extends TaxonomyEntry<BrandingType> {
  /** One-line positioning, used under the label on collection cards. */
  description: string;
  /** Hero background for the branding landing page. */
  image: string;
  /** Sentence under the title in the collection hero (reference/Collections Details.png). */
  headline: string;
  /** Eyebrow above the intro copy on the collection page. */
  tagline: string;
  /** Intro paragraphs on the collection page. */
  body: readonly string[];
  /** Editorial images beside the intro copy — two large, two small, in that order. */
  gallery: readonly string[];
}

export const BRANDING = [
  {
    key: "MY_LINDWAY",
    label: "My Lindway",
    slug: "my-lindway",
    description: "Luxury Kebaya & Couture",
    image: "/images/home-product-my-lindway.webp",
    headline: "Made-to-order artisanal pieces that blend Indonesian heritage with modern grace.",
    tagline: "Embracing Artistry, Celebrating Culture",
    body: [
      "Our flagship collection is a tribute to Indonesia's rich cultural heritage. Every piece is made-to-order—crafted upon request to honor the art of slow fashion. From intricate embroidery to hand-painted fabrics and sequined artistry, My Lindway pieces are custom creations, designed to reflect your individuality.",
      "We also offer a range of everyday kebaya—available in various ready designs, sizes, and motifs. These are made in limited quantities and are ready to wear or available for faster delivery.",
    ],
    gallery: ["/images/my-lindway-description-big.webp", "/images/my-lindway-description-list-1.webp", "/images/my-lindway-description-list-2.webp", "/images/my-lindway-description-list-3.webp"],
    order: 1,
    isActive: true,
  },
  {
    key: "SIMPLY_LINDWAY",
    label: "Simply Lindway",
    slug: "simply-lindway",
    description: "Everyday Heritage Wear",
    image: "/images/home-product-simply-lindway.webp",
    headline: "Soft essentials for everyday wear, made in 100% pure cotton.",
    tagline: "Pure Cotton Comfort",
    body: [
      "Simply Lindway is our everyday line—easy silhouettes cut from breathable cotton and finished with the same care as our couture pieces. Made for the school run, the market and the long afternoon in between.",
      "Each style is produced in small batches so the fit, the fabric and the finish stay consistent from one season to the next.",
    ],
    gallery: [
      "/images/simply-lindway-description-big.webp",
      "/images/simply-lindway-description-list-1.webp",
      "/images/simply-lindway-description-list-2.webp",
      "/images/simply-lindway-description-list-3.webp",
    ],
    order: 2,
    isActive: true,
  },
  {
    key: "LURE_BY_LINDWAY",
    label: "Lure by Lindway",
    slug: "lure-by-lindway",
    description: "Crochet Resort Wear",
    image: "/images/home-product-lure-by-lindway.webp",
    headline: "Hand-crocheted resort wear for slow days and warm coastlines.",
    tagline: "Traditional Soul, Modern Edge",
    body: [
      "Lure is our resort line, hand-crocheted stitch by stitch by artisans across Bali. Open weaves, relaxed shapes and natural yarns made for heat, salt and sunlight.",
      "Because every piece is worked by hand, no two are ever quite identical—the small variations are the signature, not the flaw.",
    ],
    gallery: [
      "/images/lure-by-lindway-description-big.webp",
      "/images/lure-by-lindway-description-list-1.webp",
      "/images/lure-by-lindway-description-list-2.webp",
      "/images/lure-by-lindway-description-list-3.webp",
    ],
    order: 3,
    isActive: true,
  },
  // Photography for the two lines below is still with the client, so they fall back to
  // the shared placeholder. Copy is the design's; swap the art in when it arrives.
  {
    key: "STUDIO_BY_LINDWAY",
    label: "Studio by Lindway",
    slug: "studio-by-lindway",
    description: "Contemporary Balinese Wear",
    image: "",
    headline: "Contemporary Balinese wear, cut in our Denpasar studio.",
    tagline: "Modern Lines, Island Roots",
    body: ["Studio is where our atelier experiments—sharper tailoring, quieter palettes, and Balinese detail worked into contemporary shapes."],
    gallery: [],
    order: 4,
    isActive: true,
  },
  {
    key: "LINDWAY_AWP",
    label: "Lindway × AWP",
    slug: "lindway-awp",
    description: "Artisan Collaboration",
    image: "",
    headline: "A collaboration series made with artisans we have worked alongside for years.",
    tagline: "Made Together",
    body: ["Limited collaborative runs, produced with partner artisans and released only while the materials last."],
    gallery: [],
    order: 5,
    isActive: true,
  },
] as const satisfies readonly BrandingEntry[];

export const AUDIENCE = [
  { key: "WOMEN", label: "Women", slug: "women", order: 1, isActive: true },
  { key: "MEN", label: "Men", slug: "men", order: 2, isActive: true },
  { key: "KIDS", label: "Kids", slug: "kids", order: 3, isActive: true },
] as const satisfies readonly TaxonomyEntry<AudienceType>[];

export const GARMENT = [
  { key: "DRESSES", label: "Dresses", slug: "dresses", order: 1, isActive: true },
  { key: "TOPS", label: "Tops", slug: "tops", order: 2, isActive: true },
  { key: "SKIRTS", label: "Skirts", slug: "skirts", order: 3, isActive: true },
] as const satisfies readonly TaxonomyEntry<GarmentType>[];

// =============================================================================
// Drift guard
//
// The tables were dropped in favour of enums (D25), so nothing at runtime checks
// that this file still describes every enum value. Without the assertions below,
// adding LINDWAY_XYZ to the Prisma enum and forgetting this file would produce a
// product tagged with a key that no page can render — and no error anywhere.
//
// These fail at COMPILE time: the arrays are `as const`, so their `key` fields are
// literal types, and AssertCovers resolves to an un-assignable object type listing
// exactly which enum value is missing.
// =============================================================================

/** Every enum value listed above must appear, or this resolves to `never`. */
type AssertCovers<Enum extends string, Listed extends string> = [Exclude<Enum, Listed>] extends [never] ? true : { MISSING_FROM_TAXONOMY_TS: Exclude<Enum, Listed> };

const _brandingCovered: AssertCovers<BrandingType, (typeof BRANDING)[number]["key"]> = true;
const _audienceCovered: AssertCovers<AudienceType, (typeof AUDIENCE)[number]["key"]> = true;
const _garmentCovered: AssertCovers<GarmentType, (typeof GARMENT)[number]["key"]> = true;

void _brandingCovered;
void _audienceCovered;
void _garmentCovered;

const activeSorted = <T extends TaxonomyEntry<string>>(entries: readonly T[]) => entries.filter((entry) => entry.isActive).sort((a, b) => a.order - b.order);

export const activeBranding = () => activeSorted(BRANDING);
export const activeAudience = () => activeSorted(AUDIENCE);
export const activeGarment = () => activeSorted(GARMENT);

const bySlug = <T extends TaxonomyEntry<string>>(entries: readonly T[], slug: string) => entries.find((entry) => entry.slug === slug && entry.isActive);

export const brandingBySlug = (slug: string) => bySlug(BRANDING, slug);
export const audienceBySlug = (slug: string) => bySlug(AUDIENCE, slug);
export const garmentBySlug = (slug: string) => bySlug(GARMENT, slug);

const byKey = <T extends TaxonomyEntry<string>>(entries: readonly T[], key: string) => entries.find((entry) => entry.key === key);

/**
 * Widened to `boolean` on purpose. The arrays are `as const`, so reading `.isActive`
 * off an entry yields the literal `true`/`false` and any `=== false` check at a call
 * site narrows to a compile error the moment every entry happens to be active.
 * An unknown key is treated as active so a drifted branding still renders.
 */
export const isBrandingActive = (key: BrandingType): boolean => byKey(BRANDING, key)?.isActive ?? true;

export const brandingByKey = (key: BrandingType) => byKey(BRANDING, key);
export const audienceByKey = (key: AudienceType) => byKey(AUDIENCE, key);
export const garmentByKey = (key: GarmentType) => byKey(GARMENT, key);
