import { ContactContent } from "@/components/ui/customer-care";
import { EverySnap } from "@/components/ui";
import { PageHero } from "@/components/ui/storefront";

export const metadata = { title: "Contact Us — Lindway" };

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact Us"
        description="Our team is here to help. Leave us a message and we'll get back to you within 1–2 business days."
        image="/images/contact-us-header-background.webp"
        crumbs={[{ name: "Home", href: "/" }, { name: "Customer Care" }, { name: "Contact Us" }]}
        cta="Get in Touch"
      />
      <ContactContent />
      <EverySnap />
    </>
  );
}
