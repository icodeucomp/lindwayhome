import { notFound } from "next/navigation";

import { CollectionFavorites, CollectionIntro, CollectionStrip, ProductListing } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { IMAGE_FALLBACK, PageHero } from "@/components/ui/storefront";

import { BRAND, brandBySlug } from "@/static/taxonomy";

export const generateStaticParams = () => BRAND.filter((entry) => entry.isActive).map((entry) => ({ brand: entry.slug }));

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const entry = brandBySlug(brand);
  return entry ? { title: `${entry.label} — Lindway`, description: entry.headline } : { title: "Collections — Lindway" };
}

export default async function CollectionPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const entry = brandBySlug(brand);

  // Inactive brands resolve to undefined, so an unreleased line 404s instead of
  // rendering a page with no copy and no products.
  if (!entry) notFound();

  return (
    <>
      <PageHero
        title={entry.label}
        description={entry.headline}
        image={entry.image || IMAGE_FALLBACK}
        crumbs={[{ name: "Home", href: "/" }, { name: "Collections" }, { name: entry.label }]}
        cta="Discover the Collection"
        align="center"
      />
      <CollectionIntro entry={entry} />
      <CollectionFavorites brand={entry.key} />
      <ProductListing fixed={{ brand: entry.key }} />
      <CollectionStrip exclude={entry.key} />
      <Journal title="Style Journal" />
    </>
  );
}
