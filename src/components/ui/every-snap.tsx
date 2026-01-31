import { ImageSlider, Img, Motion } from "@/components";

const everySnap = [
  "/images/style-&-heritage-in-every-snap-1.webp",
  "/images/style-&-heritage-in-every-snap-2.webp",
  "/images/style-&-heritage-in-every-snap-3.webp",
  "/images/style-&-heritage-in-every-snap-4.webp",
  "/images/style-&-heritage-in-every-snap-5.webp",
];

export const EverySnap = () => {
  return (
    <div className="px-4 pt-16 pb-4 space-y-4 md:space-y-6 sm:px-0">
      <Motion tag="h3" initialY={0} animateY={0} duration={0.3} className="text-center heading">
        Style & Heritage in Every Snap
      </Motion>
      <Motion tag="div" initialY={0} animateY={0} duration={0.6} delay={0.2} className="text-sm text-center md:text-base text-gray">
        <p>Celebrating timeless elegance and cultural craftsmanship in every moment.</p>
        <p>Follow us on Instagram @mylindway to explore more.</p>
      </Motion>
      <Motion tag="div" initialY={0} animateY={0} duration={0.9} delay={0.4} className="hidden gap-4 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {everySnap.map((snap, index) => (
          <Motion key={index} tag="div" initialY={50} animateY={0} duration={0.3} delay={index * 0.1}>
            <Img src={snap} alt={`every snap ${index + 1}`} className="object-cover w-full min-h-100" cover />
          </Motion>
        ))}
      </Motion>
      <Motion tag="div" initialY={0} animateY={0} duration={0.9} delay={0.4} className="block sm:hidden">
        <ImageSlider images={everySnap} alt="Every snap image" showProgressBar={false} showCounter={false} autoPlay={false} className="h-96" />
      </Motion>
    </div>
  );
};
