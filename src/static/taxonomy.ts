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

// These mirror the Prisma enums of the same name. They are declared locally rather
// than imported from `prisma-client/client` so this file compiles before the phase-1
// migration exists. Once it does, add a compile-time assertion that the two agree —
// a silent drift here would mean a product tagged with a key no page can render.
export type BrandingType = "MY_LINDWAY" | "SIMPLY_LINDWAY" | "LURE_BY_LINDWAY" | "STUDIO_BY_LINDWAY" | "LINDWAY_AWP";
export type AudienceType = "WOMEN" | "MEN" | "KIDS";
export type GarmentType = "DRESSES" | "TOPS" | "SKIRTS";

export interface TaxonomyEntry<T extends string> {
  key: T;
  label: string;
  slug: string;
  order: number;
  isActive: boolean;
}

export interface BrandingEntry extends TaxonomyEntry<BrandingType> {
  /** Subheadline on the Branding Hero. */
  description: string;
  /** Hero background for the branding landing page. */
  image: string;
}

export const BRANDING: BrandingEntry[] = [
  {
    key: "MY_LINDWAY",
    label: "My Lindway",
    slug: "my-lindway",
    description: "Embracing Artistry, Celebrating Culture",
    image: "/images/home-product-my-lindway.webp",
    order: 1,
    isActive: true,
  },
  {
    key: "SIMPLY_LINDWAY",
    label: "Simply Lindway",
    slug: "simply-lindway",
    description: "Pure Cotton Comfort",
    image: "/images/home-product-simply-lindway.webp",
    order: 2,
    isActive: true,
  },
  {
    key: "LURE_BY_LINDWAY",
    label: "Lure by Lindway",
    slug: "lure-by-lindway",
    description: "Traditional Soul, Modern Edge",
    image: "/images/home-product-lure-by-lindway.webp",
    order: 3,
    isActive: true,
  },
  // Copy and artwork for the two lines below are still with the client. They are
  // inactive so nothing links to an empty page; flip isActive once the assets land.
  {
    key: "STUDIO_BY_LINDWAY",
    label: "Studio by Lindway",
    slug: "studio-by-lindway",
    description: "",
    image: "",
    order: 4,
    isActive: false,
  },
  {
    key: "LINDWAY_AWP",
    label: "Lindway × AWP",
    slug: "lindway-awp",
    description: "",
    image: "",
    order: 5,
    isActive: false,
  },
];

export const AUDIENCE: TaxonomyEntry<AudienceType>[] = [
  { key: "WOMEN", label: "Women", slug: "women", order: 1, isActive: true },
  { key: "MEN", label: "Men", slug: "men", order: 2, isActive: true },
  { key: "KIDS", label: "Kids", slug: "kids", order: 3, isActive: true },
];

export const GARMENT: TaxonomyEntry<GarmentType>[] = [
  { key: "DRESSES", label: "Dresses", slug: "dresses", order: 1, isActive: true },
  { key: "TOPS", label: "Tops", slug: "tops", order: 2, isActive: true },
  { key: "SKIRTS", label: "Skirts", slug: "skirts", order: 3, isActive: true },
];

const activeSorted = <T extends TaxonomyEntry<string>>(entries: T[]) => entries.filter((entry) => entry.isActive).sort((a, b) => a.order - b.order);

export const activeBranding = () => activeSorted(BRANDING);
export const activeAudience = () => activeSorted(AUDIENCE);
export const activeGarment = () => activeSorted(GARMENT);

const bySlug = <T extends TaxonomyEntry<string>>(entries: T[], slug: string) => entries.find((entry) => entry.slug === slug && entry.isActive);

export const brandingBySlug = (slug: string) => bySlug(BRANDING, slug);
export const audienceBySlug = (slug: string) => bySlug(AUDIENCE, slug);
export const garmentBySlug = (slug: string) => bySlug(GARMENT, slug);

const byKey = <T extends TaxonomyEntry<string>>(entries: T[], key: string) => entries.find((entry) => entry.key === key);

export const brandingByKey = (key: BrandingType) => byKey(BRANDING, key);
export const audienceByKey = (key: AudienceType) => byKey(AUDIENCE, key);
export const garmentByKey = (key: GarmentType) => byKey(GARMENT, key);
