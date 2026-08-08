import { notFound } from "next/navigation";

import { CollectionFavorites, CollectionIntro, CollectionStrip, ProductListing } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { IMAGE_FALLBACK, PageHero } from "@/components/ui/storefront";

import { BRANDING, brandingBySlug } from "@/static/taxonomy";

export const generateStaticParams = () => BRANDING.filter((entry) => entry.isActive).map((entry) => ({ branding: entry.slug }));

export async function generateMetadata({ params }: { params: Promise<{ branding: string }> }) {
  const { branding } = await params;
  const entry = brandingBySlug(branding);
  return entry ? { title: `${entry.label} — Lindway`, description: entry.headline } : { title: "Collections — Lindway" };
}

export default async function CollectionPage({ params }: { params: Promise<{ branding: string }> }) {
  const { branding } = await params;
  const entry = brandingBySlug(branding);

  // Inactive brandings resolve to undefined, so an unreleased line 404s instead of
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
      <CollectionFavorites branding={entry.key} />
      <ProductListing fixed={{ branding: entry.key }} />
      <CollectionStrip exclude={entry.key} />
      <Journal title="Style Journal" />
    </>
  );
}
