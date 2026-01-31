import { Img, Motion } from "@/components";

export const CareInstructions = () => {
  return (
    <div className="grid grid-cols-1 px-4 pt-8 mx-auto md:grid-cols-2 md:py-16 sm:px-8 md:px-0 max-w-screen-2xl">
      <Motion tag="div" initialY={50} animateY={0} duration={0.5} className="order-2 py-4 space-y-2 sm:space-y-4 md:p-10 lg:p-16 text-gray md:order-1">
        <h4 className="heading">Garment Care Instructions</h4>
        <ul className="pl-6 space-y-1 text-xs list-disc sm:text-base">
          <li>Wash before the first wear</li>
          <li>Wash inside out</li>
          <li>Gentle cold water</li>
          <li>Hand wash only</li>
          <li>Avoid detergents with fragrances or dyes</li>
          <li>Do not bleach</li>
          <li>Do not tumble dry</li>
          <li>Warm iron</li>
          <li>Do not dry clean</li>
        </ul>
      </Motion>
      <Motion tag="div" initialY={50} animateY={0} duration={0.5} delay={0.1} className="order-1 md:order-2">
        <Img src="/images/care-instructions-garmen-image.webp" alt="image return exhanges" className="w-full min-h-100 sm:min-h-125" cover />
      </Motion>
    </div>
  );
};
