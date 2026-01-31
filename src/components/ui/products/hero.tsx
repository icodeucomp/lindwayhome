"use client";

import { Background, Container, Motion } from "@/components";

import { useRouter } from "next/navigation";

import { Header } from "@/components/ui";

import { formatSpaceToDash } from "@/utils";

interface HeroProps {
  imagePath: string;
  title: string;
  description: string;
}

export const Hero = ({ description, title, imagePath }: HeroProps) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/${formatSpaceToDash(title)}`, { scroll: false });

    setTimeout(() => {
      const element = document.getElementById("section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };
  return (
    <Background src={imagePath} alt="hero background" className="flex flex-col items-center min-h-150 bg-filter">
      <Header />
      <Container className="pt-32 space-y-4 text-center sm:text-justify">
        <Motion tag="h3" initialY={50} animateY={0} duration={0.2} className="text-2xl font-semibold lg:text-3xl">
          {title}
        </Motion>
        <Motion tag="p" initialY={50} animateY={0} duration={0.4} delay={0.2} className="max-w-5xl text-sm sm:text-base md:text-lg">
          {description}
        </Motion>
        <Motion tag="div" initialY={50} animateY={0} duration={0.6} delay={0.2} className="block pt-4">
          <button onClick={handleClick} className="block pb-2 mx-auto border-b border-light w-max sm:mx-0">
            Discover the Collection
          </button>
        </Motion>
      </Container>
    </Background>
  );
};
