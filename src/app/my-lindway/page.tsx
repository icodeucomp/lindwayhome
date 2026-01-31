import { Footer, EverySnap } from "@/components/ui";
import { Hero, MyLindway } from "@/components/ui/products";

export default function MyLindwayPage() {
  return (
    <main>
      <Hero title="My Lindway" description="Made-to-order artisanal pieces that blend Indonesian heritage with modern grace." imagePath="/images/my-lindway-header-background.webp" />
      <MyLindway />
      <EverySnap />
      <Footer />
    </main>
  );
}
