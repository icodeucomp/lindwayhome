import Link from "next/link";

import { Img, Motion } from "@/components";
import { formatSpaceToDash, formatUnderscoreToDash } from "@/utils";

interface OtherProducts {
  title1: string;
  title2: string;
  description1: string;
  description2: string;
  title1_image1: string;
  title1_image2: string;
  title1_image3: string;
  title2_image1: string;
  title2_image2: string;
  title2_image3: string;
}

export const OtherProducts = ({ title1, title2, description1, description2, title1_image1, title1_image2, title1_image3, title2_image1, title2_image2, title2_image3 }: OtherProducts) => {
  return (
    <>
      <Motion tag="div" initialY={0} animateY={0} duration={0.3} className="mx-auto space-y-12 text-gray max-w-screen-2xl">
        <div className="flex flex-col-reverse gap-4 px-4 overflow-hidden sm:gap-6 sm:px-0 sm:flex-row">
          <div className="flex flex-col items-center justify-center w-full max-w-lg gap-2 text-center sm:gap-4">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold sm:text-2xl">{title1}</h5>
              <h6 className="mx-auto text-base italic font-light leading-6 sm:text-xl sm:max-w-60">{description1}</h6>
            </div>
            <Link href={formatSpaceToDash(title1)} className="block pb-1 text-sm font-medium border-b sm:text-lg border-gray w-max">
              Discover Now
            </Link>
          </div>
          <Img src={title1_image1} alt={`${formatUnderscoreToDash(title1)}-description-list-1`} className="w-full mx-auto max-w-96 min-h-75 sm:min-h-100 md:min-h-125" cover />
          <div className="hidden w-full max-w-96 md:block">
            <Img src={title1_image2} alt={`${formatUnderscoreToDash(title1)}-description-list-2`} className="w-full max-w-96 min-h-125" cover />
          </div>
          <div className="hidden w-full max-w-44 xl:block">
            <Img src={title1_image3} alt={`${formatUnderscoreToDash(title1)}-description-list-3`} className="w-full max-w-44 min-h-125" cover />
          </div>
        </div>
      </Motion>
      <Motion tag="div" initialY={0} animateY={0} duration={0.3} className="mx-auto space-y-12 text-gray max-w-screen-2xl">
        <div className="flex flex-col gap-4 px-4 overflow-hidden sm:gap-6 sm:px-0 sm:flex-row">
          <div className="hidden w-full max-w-44 xl:block">
            <Img src={title2_image1} alt={`${formatUnderscoreToDash(title2)}-description-list-1`} className="w-full max-w-44 min-h-125" cover />
          </div>
          <div className="hidden w-full max-w-96 md:block">
            <Img src={title2_image2} alt={`${formatUnderscoreToDash(title2)}-description-list-2`} className="w-full max-w-96 min-h-125" cover />
          </div>
          <Img src={title2_image3} alt={`${formatUnderscoreToDash(title2)}-description-list-3`} className="w-full mx-auto max-w-96 min-h-75 sm:min-h-100 md:min-h-125" cover />
          <div className="flex flex-col items-center justify-center w-full max-w-lg gap-2 text-center sm:gap-4">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold sm:text-2xl">{title2}</h5>
              <h6 className="mx-auto text-base italic font-light leading-6 sm:text-xl sm:max-w-60">{description2}</h6>
            </div>
            <Link href={formatSpaceToDash(title2)} className="block pb-1 text-sm font-medium border-b sm:text-lg border-gray w-max">
              Discover Now
            </Link>
          </div>
        </div>
      </Motion>
    </>
  );
};
