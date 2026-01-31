import { Footer, EverySnap, Hero, HowToShop } from "@/components/ui";

export default function ShopPage() {
  return (
    <main>
      <Hero
        title="How to Shop"
        description="At Lindway, we aim to make your shopping experience as seamless and personal as our designs. Whether you're looking for everyday elegance or a bespoke statement piece, follow these simple steps to order your favorite styles."
        imagePath="/images/how-to-shop-header-background.webp"
      />
      <HowToShop />
      <EverySnap />
      <Footer />
    </main>
  );
}
