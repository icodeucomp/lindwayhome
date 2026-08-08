import { notFound } from "next/navigation";

import { CollectionStrip, ProductListing, ShopLinks } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { PageHero } from "@/components/ui/storefront";

import { GARMENT, garmentBySlug } from "@/static/taxonomy";

/** The garment axis is a static enum (D25), so every listing can be pre-rendered. */
export const generateStaticParams = () => GARMENT.filter((entry) => entry.isActive).map((entry) => ({ garment: entry.slug }));

export async function generateMetadata({ params }: { params: Promise<{ garment: string }> }) {
  const { garment } = await params;
  const entry = garmentBySlug(garment);
  return { title: entry ? `${entry.label} — Lindway` : "Shop — Lindway" };
}

export default async function GarmentListingPage({ params }: { params: Promise<{ garment: string }> }) {
  const { garment } = await params;
  const entry = garmentBySlug(garment);

  // `garmentBySlug` ignores inactive entries, so a deactivated garment 404s rather
  // than rendering a listing nothing links to.
  if (!entry) notFound();

  return (
    <>
      <PageHero
        title={entry.label}
        description={`Explore our ${entry.label.toLowerCase()}, cut and finished by hand in our Bali atelier.`}
        image="/images/home-header-background.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Shop" }, { name: entry.label }]}
        cta="Shop Now"
      />
      <ShopLinks />
      <ProductListing fixed={{ garment: entry.key }} />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
