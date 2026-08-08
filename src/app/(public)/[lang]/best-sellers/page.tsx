import { CollectionStrip, ProductListing, ShopLinks } from "@/components/ui/catalog";
import { Journal } from "@/components/ui/home";
import { PageHero } from "@/components/ui/storefront";

export const metadata = { title: "Best Sellers — Lindway" };

export default function BestSellersPage() {
  return (
    <>
      <PageHero
        title="Best Sellers"
        description="Explore the most-loved designs, chosen for their refined silhouettes, enduring craftsmanship, and everyday sophistication."
        image="/images/home-product-my-lindway.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Collection" }, { name: "Best Sellers" }]}
        cta="Shop Now"
      />
      <ShopLinks />
      <ProductListing defaultSort="best-sellers" />
      <CollectionStrip />
      <Journal title="Style Journal" />
    </>
  );
}
