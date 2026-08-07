/**
 * Canonical taxonomy display data (CLAUDE.md D25).
 *
 * Branding, audience and clothing are Prisma enums, so the database stores only the
 * key. Everything a page needs to render — label, URL slug, hero copy, hero image,
 * menu order — lives here.
 *
 * Consequences to keep in mind:
 *   · Adding a branding, audience or clothing means editing the Prisma enum, running
 *     a migration, editing this file, and deploying. There is no admin screen.
 *   · `isActive: false` hides an entry from the navigation and its listing without
 *     removing the enum value, so products already tagged with it are never orphaned.
 *   · Labels are intentionally NOT translated (D2) — brand and category names read
 *     the same in both languages.
 */

import type { $Enums } from "prisma-client/client";

export type BrandingType = $Enums.BrandingType;
export type AudienceType = $Enums.AudienceType;
export type ClothingType = $Enums.ClothingType;

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

export const BRANDING = [
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
] as const satisfies readonly BrandingEntry[];

export const AUDIENCE = [
  { key: "WOMEN", label: "Women", slug: "women", order: 1, isActive: true },
  { key: "MEN", label: "Men", slug: "men", order: 2, isActive: true },
  { key: "KIDS", label: "Kids", slug: "kids", order: 3, isActive: true },
] as const satisfies readonly TaxonomyEntry<AudienceType>[];

export const CLOTHING = [
  { key: "DRESSES", label: "Dresses", slug: "dresses", order: 1, isActive: true },
  { key: "TOPS", label: "Tops", slug: "tops", order: 2, isActive: true },
  { key: "SKIRTS", label: "Skirts", slug: "skirts", order: 3, isActive: true },
] as const satisfies readonly TaxonomyEntry<ClothingType>[];

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
const _clothingCovered: AssertCovers<ClothingType, (typeof CLOTHING)[number]["key"]> = true;

void _brandingCovered;
void _audienceCovered;
void _clothingCovered;

const activeSorted = <T extends TaxonomyEntry<string>>(entries: readonly T[]) => entries.filter((entry) => entry.isActive).sort((a, b) => a.order - b.order);

export const activeBranding = () => activeSorted(BRANDING);
export const activeAudience = () => activeSorted(AUDIENCE);
export const activeClothing = () => activeSorted(CLOTHING);

const bySlug = <T extends TaxonomyEntry<string>>(entries: readonly T[], slug: string) => entries.find((entry) => entry.slug === slug && entry.isActive);

export const brandingBySlug = (slug: string) => bySlug(BRANDING, slug);
export const audienceBySlug = (slug: string) => bySlug(AUDIENCE, slug);
export const clothingBySlug = (slug: string) => bySlug(CLOTHING, slug);

const byKey = <T extends TaxonomyEntry<string>>(entries: readonly T[], key: string) => entries.find((entry) => entry.key === key);

export const brandingByKey = (key: BrandingType) => byKey(BRANDING, key);
export const audienceByKey = (key: AudienceType) => byKey(AUDIENCE, key);
export const clothingByKey = (key: ClothingType) => byKey(CLOTHING, key);
