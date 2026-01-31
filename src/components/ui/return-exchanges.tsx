import { Img, Motion } from "@/components";

export const ReturnExchanges = () => {
  return (
    <div className="grid grid-cols-1 pt-8 mx-auto md:py-16 md:grid-cols-2 max-w-screen-2xl">
      <Motion tag="div" initialY={50} animateY={0} duration={0.5} className="px-4 sm:px-8 md:p-0">
        <Img src="/images/return-&-exchanges-policies-image.webp" alt="image return exhanges" className="w-full min-h-100 sm:min-h-125" cover />
      </Motion>
      <Motion tag="div" initialY={50} animateY={0} duration={0.5} delay={0.2} className="p-4 space-y-4 sm:p-8 md:p-4 lg:p-8 xl:p-16 text-gray">
        <h4 className="heading">Return and Exchanges Policies</h4>
        <ul className="pl-6 space-y-1 text-sm list-disc sm:text-base">
          <li>All items are final sale, not eligible fo return</li>
          <li>Non-refundable</li>
          <li>Non-modifiable</li>
          <li>Non-cashable</li>
          <li>Non-exchangeable</li>
          <li>Non-transferable</li>
        </ul>
        <div className="space-y-1 text-sm sm:text-base">
          <h5 className="text-xl font-medium">Special Conditions</h5>
          <p>Returned or exchanged may be provided; the items have to be in the same condition as when it is purchased. Items that include a bag must be returned with it.</p>
        </div>
      </Motion>
    </div>
  );
};
