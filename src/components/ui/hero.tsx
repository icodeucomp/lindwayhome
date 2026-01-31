import { Background, Container, Motion } from "@/components";
import { Header } from "@/components/ui";

interface HeroProps {
  imagePath: string;
  title: string;
  description: string;
}

export const Hero = ({ description, title, imagePath }: HeroProps) => {
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
      </Container>
    </Background>
  );
};
