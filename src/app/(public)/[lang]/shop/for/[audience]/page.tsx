import { notFound } from "next/navigation";

import { CollectionStrip, ProductListing, ShopLinks } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { PageHero } from "@/components/ui/storefront";

import { AUDIENCE, audienceBySlug } from "@/static/taxonomy";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const generateStaticParams = () => AUDIENCE.filter((entry) => entry.isActive).map((entry) => ({ audience: entry.slug }));

export async function generateMetadata({ params }: { params: Promise<{ audience: string }> }) {
  const { audience } = await params;
  const entry = audienceBySlug(audience);
  return { title: entry ? `${entry.label} — Lindway` : "Shop — Lindway" };
}

export default async function AudienceListingPage({ params }: { params: Promise<{ audience: string }> }) {
  const { audience } = await params;
  const entry = audienceBySlug(audience);

  if (!entry) notFound();

  return (
    <>
      <PageHero
        title={entry.label}
        description={`Pieces made for ${entry.label.toLowerCase()} — artisanal, comfortable, and built to last.`}
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Shop" }, { name: entry.label }]}
        cta="Shop Now"
      />
      <ShopLinks />
      <ProductListing fixed={{ audience: entry.key }} />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
