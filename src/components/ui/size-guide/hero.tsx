import { Background, Container, Motion } from "@/components";
import { Header } from "@/components/ui";

export const Hero = () => {
  return (
    <Background src="/images/size-guide-header-background.webp" alt="hero background" className="flex flex-col items-center min-h-150 bg-filter">
      <Header />
      <Container className="pt-24 space-y-4 text-center sm:text-justify md:pt-32">
        <Motion tag="h3" initialY={50} animateY={0} duration={0.3} className="text-2xl font-semibold lg:text-3xl">
          Size Guide
        </Motion>
        <Motion tag="p" initialY={50} animateY={0} duration={0.6} delay={0.1} className="max-w-5xl text-sm sm:text-base md:text-lg">
          At Lindway, we believe every piece should feel like it was made just for you. Whether you&apos;re dressing in our intricately crafted kebaya, effortless everyday wear, or charming tees, the
          right fit brings comfort, confidence, and beauty to life.
        </Motion>
        <Motion tag="p" initialY={50} animateY={0} duration={0.6} delay={0.2} className="max-w-5xl text-sm sm:text-base md:text-lg">
          Explore our guide below to help you choose the size that fits you best—or reach out for a custom fit designed with you in mind.
        </Motion>
      </Container>
    </Background>
  );
};
