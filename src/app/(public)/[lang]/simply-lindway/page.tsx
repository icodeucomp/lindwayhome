import { Footer, EverySnap } from "@/components/ui";
import { Hero, SimplyLindway } from "@/components/ui/products";

export default function MyLindwayPage() {
  return (
    <main>
      <Hero title="Simply Lindway" description="Soft essentials for babies and children in 100% pure cotton." imagePath="/images/simply-lindway-header-background.webp" />
      <SimplyLindway />
      <EverySnap />
      <Footer />
    </main>
  );
}
