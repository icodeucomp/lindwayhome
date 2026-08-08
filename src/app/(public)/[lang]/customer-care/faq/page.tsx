import { FaqContent } from "@/components/ui/customer-care";
import { EverySnap } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

export const metadata = { title: "Frequently Asked Questions — Lindway" };

export default function FaqPage() {
  return (
    <>
      <PageHero
        title="Frequently Asked Questions"
        description="Answers to what we are asked most — ordering, shipping, sizing and care."
        image="/images/home-header-background.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "FAQ" }]}
        cta="Explore Now"
      />
      <FaqContent />
      <EverySnap />
    </>
  );
}
