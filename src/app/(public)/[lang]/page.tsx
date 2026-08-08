import { EverySnap } from "@/components/ui";

import { AtelierPromos, Collections, FabricLibraryPromo, Hero, Journal, JustArrived } from "@/components/ui/home";

import { careValues, craftValues, FeatureStrip } from "@/components/ui/storefront";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureStrip items={craftValues} />
      <JustArrived />
      <Collections />
      <AtelierPromos />
      <Journal />
      <FabricLibraryPromo />
      <FeatureStrip items={careValues} />
      <EverySnap />
    </>
  );
}
