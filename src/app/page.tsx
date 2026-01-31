import { Footer, EverySnap } from "@/components/ui";
import { CuratedCollection, Hero, Products } from "@/components/ui/home";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Products />
      <CuratedCollection />
      <EverySnap />
      <Footer />
    </main>
  );
}
