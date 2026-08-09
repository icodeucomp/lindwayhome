import { JournalList } from "@/components/ui/journal";
import { PageHero } from "@/components/ui/storefront";

import { PLACEHOLDER_IMAGE } from "@/static/images";

export const metadata = { title: "Journal — Lindway" };

export default function JournalPage() {
  return (
    <>
      <PageHero
        title="Journal"
        description="Notes on craft, fabric and the people behind each piece."
        image={PLACEHOLDER_IMAGE}
        crumbs={[{ name: "Home", href: "/" }, { name: "Journal" }]}
        cta="Explore Now"
      />
      <JournalList />
    </>
  );
}
