import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { CollectionStrip, ProductListing, ShopLinks } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { PageHero } from "@/components/ui/storefront";

import { axisBySlug, shopSlugs } from "@/static/taxonomy";

import { isLocale, locales, type Locale } from "@/i18n/config";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/**
 * One listing route for all three taxonomy axes (CLAUDE.md §B2.1).
 *
 * `/shop/dresses`, `/shop/women` and `/shop/my-lindway` are the same page with a
 * different axis pinned, and any of them takes the others as query filters:
 * `/shop/women?brand=my-lindway&clothing=tops`. The pinned axis is never offered as a
 * filter, so a URL cannot contradict the page it is on.
 *
 * A single dynamic segment is not a shortcut — Next allows only one slug name per
 * level, so `[brand]` and `[clothing]` as siblings is a build error. The slug-clash
 * assertions in taxonomy.ts are what make one segment safe across three axes.
 *
 * `/collections/[brand]` is deliberately NOT folded in here: that page is editorial —
 * hero copy, intro, gallery, featured pieces — while this one is a filterable grid.
 * Both exist for a brand, which is why a brand slug canonicalises to the collections
 * page below rather than competing with it.
 */

const heroCopy = {
  brand: (label: string) => `Every ${label} piece, in one place — filter by clothing or who it is for.`,
  clothing: (label: string) => `Explore our ${label.toLowerCase()}, cut and finished by hand in our Bali atelier.`,
  audience: (label: string) => `Pieces made for ${label.toLowerCase()} — artisanal, comfortable, and built to last.`,
};

export const generateStaticParams = () => locales.flatMap((lang) => shopSlugs().map((slug) => ({ lang, slug })));

export async function generateMetadata({ params, searchParams }: { params: Promise<{ lang: string; slug: string }>; searchParams: Promise<Record<string, string>> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const query = await searchParams;

  if (!isLocale(lang)) return {};

  const match = axisBySlug(slug);
  if (!match) return {};

  const { axis, entry } = match;
  const filtered = ["brand", "clothing", "audience", "sort"].some((key) => query[key]);

  return {
    title: `${entry.label} — Lindway`,
    description: heroCopy[axis](entry.label),
    alternates: {
      // A brand has an editorial home; this grid is the same products in a plainer
      // frame, so the collections page is declared the authoritative version rather
      // than the two splitting each other's ranking.
      canonical: axis === "brand" ? localizedPath(lang, `/collections/${entry.slug}`) : localizedPath(lang, `/shop/${entry.slug}`),
      languages: Object.fromEntries([
        ...locales.map((locale) => [locale, localizedPath(locale, `/shop/${entry.slug}`)]),
        ["x-default", localizedPath("en", `/shop/${entry.slug}`)],
      ]),
    },
    // Filter combinations multiply without limit and every one of them is a subset of
    // this page. Indexing them would put the store in competition with itself.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

const localizedPath = (locale: Locale | string, path: string) => `/${locale}${path}`;

export default async function ShopListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const match = axisBySlug(slug);

  // `axisBySlug` ignores inactive entries, so a deactivated brand or clothing type 404s
  // rather than rendering a listing nothing links to.
  if (!match) notFound();

  const { axis, entry } = match;

  return (
    <>
      <PageHero
        title={entry.label}
        description={heroCopy[axis](entry.label)}
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Shop" }, { name: entry.label }]}
        cta="Shop Now"
      />
      <ShopLinks />
      <ProductListing fixed={{ [axis]: entry.key }} />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
