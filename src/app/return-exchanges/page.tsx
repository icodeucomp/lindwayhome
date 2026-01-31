import { Footer, EverySnap, ReturnExchanges, Hero } from "@/components/ui";

export default function ReturnExchangesPage() {
  return (
    <main>
      <Hero
        title="Return & Exchanges Policies"
        description="Clear and straightforward return and exchange terms for your peace of mind. Review our policy before making a purchase."
        imagePath="/images/return-&-exchanges-header-background.webp"
      />
      <ReturnExchanges />
      <EverySnap />
      <Footer />
    </main>
  );
}
