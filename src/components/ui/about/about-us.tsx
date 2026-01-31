import { Motion, Container, Img } from "@/components";

export const AboutUs = () => {
  return (
    <Container className="py-12 space-y-20 md:space-y-24 lg:py-16 text-gray">
      <div className="flex flex-col items-center gap-8 md:flex-row lg:gap-4">
        <Img src="/icons/dark-logo.png" alt="lindway logo" className="h-32 mx-auto min-w-64 max-w-64 md:h-40 md:min-w-80 md:max-w-80" cover />
        <div className="space-y-4 text-xs text-justify lg:text-sm">
          <Motion tag="div" initialY={30} animateY={0} duration={1} className="space-y-1 text-center md:text-start">
            <h4 className="text-2xl font-semibold">About Lindway</h4>
            <h5 className="text-lg italic font-light">Rooted in Bali, Inspired by Purpose</h5>
          </Motion>
          <Motion tag="p" initialY={30} animateY={0} duration={1} delay={0.1}>
            Lindway is more than a brand—it&apos;s a lifestyle shaped by passion, purpose, and the vibrant soul of Bali. Based in Denpasar and proudly self-manufactured, Lindway is built by the hands
            of local artisans, blending creativity and community into every thread.
          </Motion>
          <Motion tag="p" initialY={30} animateY={0} duration={1} delay={0.2}>
            Our vision is to express beauty through thoughtful design—where color, pattern, texture, and form come together in refined harmony. Each creation is a reflection of our commitment to
            elegance, craftsmanship, and authentic storytelling.
          </Motion>
          <Motion tag="p" initialY={30} animateY={0} duration={1} delay={0.3}>
            We believe in fashion with intention. That means producing high-quality pieces that not only elevate personal style but also make a positive impact on our community, our environment, and
            the planet. Every product is made with care—thoughtfully designed, responsibly crafted, and tailored to meet both aesthetic and ethical standards.
          </Motion>
          <Motion tag="p" initialY={30} animateY={0} duration={1} delay={0.4}>
            At Lindway, fabric is treated as both material and muse. We carefully select only the finest textiles and ensure minimal waste by thoughtfully repurposing leftover fabric across our
            collections. It&apos;s a quiet nod to sustainability—woven into the essence of our brand.
          </Motion>
          <Motion tag="p" initialY={30} animateY={0} duration={1} delay={0.5} className="italic font-semibold">
            With every piece, Lindway invites you to experience fashion that feels meaningful, mindful, and timeless.
          </Motion>
        </div>
      </div>
      <Motion tag="div" initialY={30} animateY={0} duration={1} className="hidden w-full gap-8 lg:flex min-h-175">
        <Img src="/images/about-lindway-lindway-philosophy-kiri.webp" alt="hero image" className="w-full max-w-80 xl:max-w-sm min-w-80 min-h-125 max-h-fit" cover />
        <div className="text-sm text-justify">
          <h4 className="pt-4 pb-8 text-lg font-semibold text-center xl:text-xl xl:pt-8 xl:pb-16">
            “Whether you&apos;re seeking a handcrafted statement piece, everyday comfort for your family, or refined modern wear inspired by tradition—Lindway offers a curated universe where heritage
            meets innovation.”
          </h4>
          <div className="flex items-center justify-between gap-8 xl:gap-16">
            <Img src="/images/about-lindway-lindway-philosophy-kanan.webp" alt="hero image" className="w-full max-w-80 xl:max-w-sm min-w-80 min-h-125" cover />
            <div className="space-y-2 text-center">
              <h5 className="text-xl font-semibold xl:text-2xl">Lindway Philosophy: </h5>
              <hr className="text-gray" />
              <h6 className="text-lg font-medium xl:text-xl">Custom. Cultural. Conscious.</h6>
            </div>
          </div>
        </div>
      </Motion>
      <Motion tag="div" initialY={30} animateY={0} duration={1} className="block space-y-8 text-center lg:hidden">
        <h4 className="text-base font-medium text-center md:font-semibold sm:text-lg">
          “Whether you&apos;re seeking a handcrafted statement piece, everyday comfort for your family, or refined modern wear inspired by tradition—Lindway offers a curated universe where heritage
          meets innovation.”
        </h4>
        <div className="flex">
          <Img src="/images/about-lindway-lindway-philosophy-kiri.webp" alt="hero image" className="w-full min-h-75 sm:min-h-100 md:min-h-125" cover />

          <Img src="/images/about-lindway-lindway-philosophy-kanan.webp" alt="hero image" className="w-full min-h-75 sm:min-h-100 md:min-h-125" cover />
        </div>
        <div className="space-y-2 text-center">
          <h5 className="text-lg font-semibold sm:text-xl xl:text-2xl">Lindway Philosophy: </h5>
          <hr className="text-gray" />
          <h6 className="text-base font-medium sm:text-lg xl:text-xl">Custom. Cultural. Conscious.</h6>
        </div>
      </Motion>
    </Container>
  );
};
