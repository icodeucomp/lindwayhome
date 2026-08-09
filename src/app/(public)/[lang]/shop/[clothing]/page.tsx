import { notFound } from "next/navigation";

import { CollectionStrip, ProductListing, ShopLinks } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { PageHero } from "@/components/ui/storefront";

import { CLOTHING, clothingBySlug } from "@/static/taxonomy";

import { PLACEHOLDER_IMAGE } from "@/static/images";

/** The clothing axis is a static enum (D25), so every listing can be pre-rendered. */
export const generateStaticParams = () => CLOTHING.filter((entry) => entry.isActive).map((entry) => ({ clothing: entry.slug }));

export async function generateMetadata({ params }: { params: Promise<{ clothing: string }> }) {
  const { clothing } = await params;
  const entry = clothingBySlug(clothing);
  return { title: entry ? `${entry.label} — Lindway` : "Shop — Lindway" };
}

export default async function ClothingListingPage({ params }: { params: Promise<{ clothing: string }> }) {
  const { clothing } = await params;
  const entry = clothingBySlug(clothing);

  // `clothingBySlug` ignores inactive entries, so a deactivated clothing 404s rather
  // than rendering a listing nothing links to.
  if (!entry) notFound();

  return (
    <>
      <PageHero
        title={entry.label}
        description={`Explore our ${entry.label.toLowerCase()}, cut and finished by hand in our Bali atelier.`}
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Shop" }, { name: entry.label }]}
        cta="Shop Now"
      />
      <ShopLinks />
      <ProductListing fixed={{ clothing: entry.key }} />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
