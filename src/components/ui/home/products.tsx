"use client";

import Link from "next/link";

import { Container, Img, Motion } from "@/components";

import { ApiResponse, Product } from "@/types";

import { productsApi } from "@/utils";

import { CardProduct } from "../card-product";

export const Products = () => {
  const { data: products, isLoading } = productsApi.useGetProducts<ApiResponse<Product[]>>({ key: ["products"], params: { limit: 3, order: "desc", isActive: true } });

  return (
    <Container className="space-y-16 py-14 md:py-16">
      <div className="space-y-4 sm:space-y-8 text-gray">
        <Motion tag="h2" initialY={50} animateY={0} duration={0.2} className="text-center heading">
          Discover the World of Lindway
        </Motion>
        <Motion tag="p" initialY={50} animateY={0} duration={0.2} className="max-w-5xl mx-auto text-sm text-center sm:text-base">
          Lindway is the parent house of three distinctive brands—each with a unique story, yet united by a shared commitment to craftsmanship, cultural heritage, and design excellence.
        </Motion>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="loader"></div>
          </div>
        ) : (
          <Motion tag="div" initialY={50} animateY={0} duration={0.3} delay={0.3} className="product-container">
            {products?.data.map((item, index) => (
              <CardProduct
                key={index}
                id={item.id}
                discountedPrice={item.discountedPrice}
                images={item.images}
                name={item.name}
                notes={item.notes}
                price={item.price}
                productionNotes={item.productionNotes}
                isPreOrder={item.isPreOrder}
                category={item.category}
              />
            ))}
          </Motion>
        )}
      </div>
      <div className="space-y-8">
        <Motion tag="div" initialY={50} animateY={0} duration={0.2} className="flex flex-col items-center gap-2 sm:gap-4 sm:flex-row">
          <Img src="/images/home-product-my-lindway.webp" alt="my lindway image" className="w-full max-w-2xl min-h-72 sm:min-h-80" position="top" cover />
          <div className="w-full space-y-1 text-center sm:space-y-2 text-gray">
            <h4 className="text-xl font-semibold sm:text-2xl">My Lindway</h4>
            <p className="text-base font-light sm:text-lg">Embracing Artistry, Celebrating Culture</p>
            <Link href="/my-lindway" className="block p-1 mx-auto text-xs font-medium border-b sm:p-2 sm:text-sm text-gray w-max">
              Discover Collection
            </Link>
          </div>
        </Motion>
        <Motion tag="div" initialY={50} animateY={0} duration={0.2} delay={0.1} className="flex flex-col-reverse items-center gap-2 sm:gap-4 sm:flex-row">
          <div className="w-full space-y-1 text-center sm:space-y-2 text-gray">
            <h4 className="text-xl font-semibold sm:text-2xl">Simply Lindway</h4>
            <p className="text-base font-light sm:text-lg">Pure Cotton Comfort</p>
            <Link href="/simply-lindway" className="block p-1 mx-auto text-xs font-medium border-b sm:p-2 sm:text-sm text-gray w-max">
              Discover Collection
            </Link>
          </div>
          <Img src="/images/home-product-simply-lindway.webp" alt="simply lindway image" className="w-full max-w-2xl min-h-72 sm:min-h-80" position="top" cover />
        </Motion>
        <Motion tag="div" initialY={50} animateY={0} duration={0.2} delay={0.2} className="flex flex-col items-center gap-2 sm:gap-4 sm:flex-row">
          <Img src="/images/home-product-lure-by-lindway.webp" alt="lure by lindway image" className="w-full max-w-2xl min-h-72 sm:min-h-80" position="top" cover />
          <div className="w-full space-y-1 text-center sm:space-y-2 text-gray">
            <h4 className="text-xl font-semibold sm:text-2xl">Lure by Lindway</h4>
            <p className="text-base font-light sm:text-lg">Traditional Soul, Modern Edge</p>
            <Link href="/lure-by-lindway" className="block p-1 mx-auto text-xs font-medium border-b sm:p-2 sm:text-sm text-gray w-max">
              Discover Collection
            </Link>
          </div>
        </Motion>
      </div>
    </Container>
  );
};
