import Link from "next/link";

import { Background, Container, ImageSlider, Img, Motion } from "@/components";

const customerPhoto = [
  "/images/customer-moment-photo-1.webp",
  "/images/customer-moment-photo-2.webp",
  "/images/customer-moment-photo-3.webp",
  "/images/customer-moment-photo-4.webp",
  "/images/customer-moment-photo-5.webp",
  "/images/customer-moment-photo-6.webp",
  "/images/customer-moment-photo-7.webp",
  "/images/customer-moment-photo-8.webp",
];

export const CuratedCollection = () => {
  return (
    <>
      <Background src="/images/contact-us-header-background.webp" alt="contact us background" className="flex items-center justify-center min-h-125 bg-light/20">
        <div className="w-full max-w-7xl px-4 space-y-8 sm:px-8">
          <div className="space-y-4 sm:space-y-8">
            <div className="space-y-4 text-center">
              <Motion tag="h3" initialY={50} animateY={0} duration={0.3} className="text-2xl font-semibold md:text-3xl">
                Curated Collection
              </Motion>
              <Motion tag="p" initialY={50} animateY={0} duration={0.3} delay={0.3} className="text-sm md:text-base">
                Each piece in our collection is thoughtfully curated to celebrate the richness of Indonesia&apos;s cultural heritage. Crafted on a made-to-order basis, our flagship designs embrace the
                art of slow fashion—honoring quality, individuality, and intentionality. From intricate embroidery and hand-painted fabrics to delicate sequin artistry, every My Lindway creation is a
                personal expression of elegance.
              </Motion>
            </div>
            <Motion tag="div" initialY={50} animateY={0} duration={0.3} delay={0.3} className="block pb-2 mx-auto font-medium border-b border-light w-max">
              <Link href="/curated-collections">Discover Collections</Link>
            </Motion>
          </div>
        </div>
      </Background>
      <Container className="mt-16">
        <Motion tag="div" initialY={0} animateY={0} duration={0.9} delay={0.3} className="hidden gap-8 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {customerPhoto.map((item, index) => (
            <Img key={index} src={item} alt="customer photo" className="w-full aspect-square" cover />
          ))}
        </Motion>
        <Motion tag="div" initialY={0} animateY={0} duration={0.9} delay={0.3} className="block sm:hidden">
          <ImageSlider images={customerPhoto} alt="customer photo" showProgressBar={false} showCounter={false} autoPlay={false} className="h-96" />
        </Motion>
      </Container>
    </>
  );
};
