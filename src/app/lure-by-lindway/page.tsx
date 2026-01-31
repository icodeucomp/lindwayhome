import { Footer, EverySnap } from "@/components/ui";
import { Hero, LureByLindway } from "@/components/ui/products";

export default function LureLindwayPage() {
  return (
    <main>
      <Hero title="Lure by Lindway" description="Menswear inspired by the spirit of contemporary Bali." imagePath="/images/lure-by-lindway-header-background.webp" />
      <LureByLindway />
      <EverySnap />
      <Footer />
    </main>
  );
}
