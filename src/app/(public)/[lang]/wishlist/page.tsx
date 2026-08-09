import { Wishlist } from "@/components/ui/catalog";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "Wishlist — Lindway" };

export default function WishlistPage() {
  return (
    <>
      <PageHero
        title="Wishlist"
        description="The pieces you have saved, kept on this device."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Wishlist" }]}
        cta="View Saved"
      />
      <Wishlist />
    </>
  );
}
