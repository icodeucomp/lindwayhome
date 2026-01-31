import { Container, Img, Motion } from "@/components";

import { fabricsLists } from "@/static/our-fabrics";

export const OurFabrics = () => {
  return (
    <div className="pt-8 md:pt-16">
      <div className="space-y-8">
        <Motion tag="h3" initialY={50} animateY={0} duration={0.5} className="text-center heading">
          Our Fabrics
        </Motion>
        <Motion tag="div" initialY={50} animateY={0} duration={0.5} delay={0.1} className="grid grid-cols-2 gap-2 px-4 mx-auto md:grid-cols-4 md:gap-4 sm:px-8 md:px-0 max-w-screen-2xl">
          {[...Array(4)].map((_, index) => (
            <div key={index} className={` relative`}>
              <Img src={`/images/our-fabric-category-image-${index + 1}.webp`} alt={`our fabrics image ${index}`} className="w-full min-h-50" cover />
            </div>
          ))}
        </Motion>
      </div>
      <Container className="grid grid-cols-1 gap-3 py-4 sm:gap-4 md:gap-8 md:py-8 md:grid-cols-2">
        {fabricsLists.map((fabric, index) => (
          <Motion tag="div" initialY={50} animateY={0} duration={0.2 * index} delay={0.1 * index} key={index} className="space-y-1 sm:space-y-2 text-gray">
            <h4 className="text-xl font-medium md:text-2xl">{fabric.name}</h4>
            <p className="text-sm leading-relaxed">{fabric.description}</p>
          </Motion>
        ))}
      </Container>
      <div className="max-w-4xl px-4 py-8 mx-auto space-y-4 text-center md:space-y-8">
        <Motion tag="div" initialY={50} animateY={0} duration={0.5} className="space-y-2">
          <h3 className="text-xl font-medium sm:text-2xl">Crafted by Hand</h3>
          <p className="text-sm leading-relaxed text-gray">
            Our fabrics often become the canvas for traditional techniques like hand embroidery, hand-painting, and sequin work. Every detail is created by skilled artisans who bring life to each
            piece through time-honored craftsmanship.
          </p>
        </Motion>
        <Motion tag="div" initialY={50} animateY={0} duration={0.5} delay={0.1} className="grid max-w-xl grid-cols-3 gap-2 mx-auto md:gap-4">
          <Img src="/images/our-fabric-crafted-by-hand-image-1.webp" alt="crafted image 1" className="w-full min-h-64 sm:min-h-75" cover />
          <Img src="/images/our-fabric-crafted-by-hand-image-2.webp" alt="crafted image 2" className="w-full min-h-64 sm:min-h-75" cover />
          <Img src="/images/our-fabric-crafted-by-hand-image-3.webp" alt="crafted image 3" className="w-full min-h-64 sm:min-h-75" cover />
        </Motion>
      </div>

      <div className="space-y-4 md:space-y-8">
        <Motion tag="div" initialY={50} animateY={0} duration={0.5} className="max-w-4xl px-4 pt-8 mx-auto space-y-2 text-center">
          <h3 className="text-xl font-medium sm:text-2xl">Thoughtfully Sourced</h3>
          <p className="text-sm leading-relaxed text-gray">
            We partner with local suppliers and small-scale producers to support ethical practices and celebrate Indonesian textile heritage. It&apos;s our way of ensuring quality — and preserving
            tradition — from the source.
          </p>
        </Motion>
        <Motion tag="div" initialY={50} animateY={0} duration={0.5} delay={0.1} className="grid grid-cols-2 px-4 sm:px-0">
          <Img src="/images/our-fabric-thoughtfully-image-1.webp" alt="Thoughtfully image 1" className="w-full min-h-64 sm:min-h-75 md:min-h-100" cover />
          <Img src="/images/our-fabric-thoughtfully-image-2.webp" alt="Thoughtfully image 2" className="w-full min-h-64 sm:min-h-75 md:min-h-100" cover />
        </Motion>
      </div>
    </div>
  );
};
