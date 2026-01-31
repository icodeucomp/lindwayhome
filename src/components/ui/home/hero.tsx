import { Background, Motion } from "@/components";
import { Header } from "@/components/ui";

export const Hero = () => {
  return (
    <Background src="/images/my-lindway-header-background.webp" alt="hero background" className="flex flex-col items-center min-h-150 bg-filter">
      <Header />
      <div className="w-full max-w-7xl px-4 pt-40 space-y-8 text-center sm:px-8">
        <Motion tag="h1" initialY={50} animateX={0} duration={0.3} className="text-2xl font-medium sm:text-3xl lg:text-4xl">
          Celebrating Indonesian Craftsmanship, <br /> From Heritage to Everyday Art.
        </Motion>
        <Motion tag="p" initialY={50} animateX={0} duration={0.6} delay={0.3} className="text-sm font-light md:text-base lg:text-xl">
          Timeless designs, crafted by artisans and inspired by Bali&apos;s living culture.
        </Motion>
      </div>
    </Background>
  );
};
