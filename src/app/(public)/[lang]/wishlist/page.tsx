import { Wishlist } from "@/components/ui/catalog";
import { PageHero } from "@/components/ui/storefront";

export const metadata = { title: "Wishlist — Lindway" };

export default function WishlistPage() {
  return (
    <>
      <PageHero
        title="Wishlist"
        description="The pieces you have saved, kept on this device."
        image="/images/home-product-my-lindway.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Wishlist" }]}
        cta="View Saved"
      />
      <Wishlist />
    </>
  );
}
