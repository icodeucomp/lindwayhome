"use client";

import { useState } from "react";

import Link from "next/link";

import { Container, Background, Img, Motion } from "@/components";

import { WomenModal } from "./women-modal";
import { MenModal } from "./men-modal";
import { BabyModal } from "./baby-modal";

export const Size = () => {
  const [isModalWomen, setIsModalWomen] = useState<boolean>(false);
  const [isModalMen, setIsModalMen] = useState<boolean>(false);
  const [isModalBaby, setIsModalBaby] = useState<boolean>(false);
  return (
    <>
      <Container className="pt-12 space-y-8 sm:pt-14 md:pt-16">
        <h2 className="text-center heading">Find Your Perfect Fit</h2>
        <Motion tag="div" initialX={0} animateX={0} duration={0.3} className="grid grid-cols-1 gap-8 mx-auto md:gap-0 md:grid-cols-3 text-light">
          <Background src="/images/size-guide-find-your-perfect-fit-women-measurement.webp" alt="women hero background" className="flex items-end justify-center p-8 min-h-100 sm:min-h-150 bg-dark/40">
            <div className="space-y-4 text-center">
              <h4 className="text-2xl font-medium max-w-40">Women Measurement</h4>
              <button onClick={() => setIsModalWomen(true)} className="block pb-2 mx-auto border-b border-light w-max">
                See details
              </button>
            </div>
          </Background>
          <Background src="/images/size-guide-find-your-perfect-fit-men-measurement.webp" alt="men hero background" className="flex items-end justify-center p-8 min-h-100 sm:min-h-150 bg-dark/40">
            <div className="space-y-4 text-center">
              <h4 className="text-2xl font-medium max-w-40">Men Measurement</h4>
              <button onClick={() => setIsModalMen(true)} className="block pb-2 mx-auto border-b border-light w-max">
                See details
              </button>
            </div>
          </Background>
          <Background src="/images/size-guide-find-your-perfect-fit-baby-measurement.webp" alt="baby hero background" className="flex items-end justify-center p-8 min-h-100 sm:min-h-150 bg-dark/40">
            <div className="space-y-4 text-center">
              <h4 className="text-2xl font-medium max-w-40">Baby & Child Measurement</h4>
              <button onClick={() => setIsModalBaby(true)} className="block pb-2 mx-auto border-b border-light w-max">
                See details
              </button>
            </div>
          </Background>
          <Background
            src="/images/size-guide-find-your-perfect-fit-custom-fit-available.webp"
            alt="custom hero background"
            className="flex items-center justify-center p-8 min-h-75 lg:min-h-100 bg-dark/40"
            parentClassName="hidden md:block md:col-span-3"
          >
            <div className="space-y-8 text-center">
              <div className="space-y-2">
                <h4 className="text-2xl font-medium">Custom Fit Available</h4>
                <p className="max-w-2xl mx-auto">Looking for a perfect, made-to-measure fit? Our team can craft your kebaya or special piece based on your exact measurements.</p>
              </div>
              <a href="https://api.whatsapp.com/send?phone=6282339936682" className="flex items-center gap-2 pb-2 mx-auto border-b border-light w-max" target="_blank" rel="noopener noreferrer">
                <Img src="/icons/whatsapp-light.svg" alt="whatsapp icons" className="size-6" />
                Send My Measurements via WhatsApp
              </a>
            </div>
          </Background>
        </Motion>
        <Motion tag="div" initialY={50} animateY={0} duration={0.3} delay={0.2} className="space-y-4 text-gray">
          <p className="text-sm sm:text-base">*For detailed garment dimensions (chest width, length), please refer to the product page or contact us directly.</p>
          <div className="text-sm sm:text-base">
            <h4 className="text-base font-medium sm:text-lg">A Few Fit Tips:</h4>
            <ul className="pl-6 list-disc">
              <li>All pieces are measured flat and may vary slightly due to artisanal techniques.</li>
              <li>Natural fabrics may relax with wear—especially batik and handwoven cotton.</li>
              <li>When in doubt, our team is happy to help you decide.</li>
            </ul>
          </div>
          <div className="text-sm sm:text-base">
            <h4 className="text-base font-medium sm:text-lg">Still Unsure?</h4>
            <p>Send us a message—we&apos;ll guide you with care. Your comfort matters just as much as your style.</p>
          </div>
          <Link href="/contact-us" className="block py-2 mx-auto text-sm border-b border-gray w-max sm:text-base">
            Chat with Us
          </Link>
        </Motion>
      </Container>
      <WomenModal isVisible={isModalWomen} onClose={() => setIsModalWomen(false)} />
      <MenModal isVisible={isModalMen} onClose={() => setIsModalMen(false)} />
      <BabyModal isVisible={isModalBaby} onClose={() => setIsModalBaby(false)} />
    </>
  );
};
