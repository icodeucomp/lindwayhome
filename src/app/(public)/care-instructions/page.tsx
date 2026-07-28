import { Footer, EverySnap, Hero, CareInstructions } from "@/components/ui";

export default function CareInstructionsPage() {
  return (
    <main>
      <Hero
        title="Care Instructions"
        description="Keep your clothes fresh and long-lasting with proper care that shows respect for both your investment and the environment. Follow these comprehensive steps to ensure your garments maintain their beauty, comfort, and quality throughout their lifetime."
        imagePath="/images/care-instructions-header-background.webp"
      />
      <CareInstructions />
      <EverySnap />
      <Footer />
    </main>
  );
}
