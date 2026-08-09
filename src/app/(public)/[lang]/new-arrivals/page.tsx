import { CollectionStrip, ProductListing, ShopLinks } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "New Arrivals — Lindway" };

export default function NewArrivalsPage() {
  return (
    <>
      <PageHero
        title="New Arrivals"
        description="The newest pieces from our atelier — released as they are finished, never before they are ready."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Collection" }, { name: "New Arrivals" }]}
        cta="Shop Now"
      />
      <ShopLinks />
      <ProductListing defaultSort="new-arrivals" />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
