"use client";

import * as React from "react";

import { Container, Img, Motion } from "@/components";

import { CardProduct } from "@/components/ui";
import { OtherProducts } from "./other-products";

import { productsApi } from "@/utils";

import { ApiResponse, Categories, Product } from "@/types";

const ProductDetail = () => {
  const [page, setPage] = React.useState<number>(1);
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [hasMore, setHasMore] = React.useState<boolean>(true);
  const limit = 6;

  const {
    data: simplyLindwayProducts,
    isError,
    isLoading,
  } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["products", Categories.SIMPLY_LINDWAY, page],
    params: { category: Categories.SIMPLY_LINDWAY, page, limit, order: "desc", isActive: true },
  });

  React.useEffect(() => {
    if (simplyLindwayProducts?.data) {
      if (page === 1) {
        setAllProducts(simplyLindwayProducts.data);
      } else {
        setAllProducts((prev) => [...prev, ...simplyLindwayProducts.data]);
      }

      const totalLoaded = page * limit;
      setHasMore(totalLoaded < simplyLindwayProducts.pagination.total);
    }
  }, [simplyLindwayProducts, page, limit]);

  const handleLoadMore = React.useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, hasMore]);

  if (isError) {
    return <div className="p-4 py-16 text-center text-red-600">Error loading products. Please try again.</div>;
  }

  return (
    <div className="space-y-6">
      <Motion tag="h4" initialY={50} animateY={0} duration={0.2} className="text-center heading">
        The Collections of Simply Lindway
      </Motion>

      {isLoading && page === 1 ? (
        <div className="flex items-center justify-center py-8">
          <div className="loader"></div>
        </div>
      ) : (
        <Motion tag="div" initialY={50} animateY={0} duration={0.3} delay={0.3} className="product-container">
          {allProducts.map((item, index) => (
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

      <div className="flex flex-col items-center justify-center h-16 space-y-2">
        {isLoading && page > 1 && (
          <div className="flex items-center justify-center py-8">
            <div className="loader"></div>
          </div>
        )}

        {!isLoading && hasMore && (
          <div className="flex justify-center text-gray">
            <button onClick={handleLoadMore} disabled={isLoading} className="block pb-1 text-lg font-medium border-b border-gray w-max cursor-pointer">
              Discover More
            </button>
          </div>
        )}

        {!isLoading && !hasMore && allProducts.length > 0 && <div className="py-4 text-center text-gray">No more product</div>}
      </div>
    </div>
  );
};

export const SimplyLindway = () => {
  return (
    <div className="space-y-12">
      <Container className="pt-8 text-gray space-y-14 md:pt-0">
        <div className="flex flex-col-reverse items-center gap-8 overflow-hidden md:flex-row lg:gap-16 xl:gap-24">
          <Motion tag="div" initialX={50} animateX={0} duration={0.6} delay={0.3} className="w-full space-y-4 text-center md:text-justify">
            <div className="space-y-1">
              <h4 className="heading">Simply Lindway</h4>
              <h5 className="text-base italic font-light lg:text-xl">Pure Cotton Comfort</h5>
            </div>
            <p className="text-sm md:text-xs lg:text-sm">
              A cozy world of everyday essentials for babies and children, crafted from 100% pure cotton. Each piece is designed with softness and care in mind, perfect for daily wear.
            </p>
            <p className="text-sm md:text-xs lg:text-sm">
              Our fabrics are sourced from certified Indonesian suppliers (SNI-compliant materials), ensuring comfort and safety for your little ones. While Simply Lindway is not yet SNI-certified, we
              uphold high standards in every stitch.
            </p>
            <div className="grid grid-cols-3 gap-1 lg:gap-4">
              <Img src="/images/simply-lindway-description-list-1.webp" alt="simply-lindway-description-list-1" className="w-full md:min-h-56 lg:min-h-72 xl:min-h-80" cover />
              <Img src="/images/simply-lindway-description-list-2.webp" alt="simply-lindway-description-list-2" className="w-full md:min-h-56 lg:min-h-72 xl:min-h-80" cover />
              <Img src="/images/simply-lindway-description-list-3.webp" alt="simply-lindway-description-list-3" className="w-full md:min-h-56 lg:min-h-72 xl:min-h-80" cover />
            </div>
          </Motion>
          <Motion tag="div" initialX={-50} animateX={0} duration={0.3} className="w-full lg:max-w-96">
            <Img src="/images/simply-lindway-description-big.webp" alt="simply-lindway-description-big" className="w-full min-h-100 sm:min-h-125 md:min-h-150 lg:min-h-175" cover position="top" />
          </Motion>
        </div>

        <div id="section">
          <ProductDetail />
        </div>
      </Container>

      <OtherProducts
        title1="My Lindway"
        title2="Lure By Lindway"
        description1="Embracing Artistry, Celebrating Culture"
        description2="Traditional Soul, Modern Edge"
        title1_image1="/images/my-lindway-description-list-1.webp"
        title1_image2="/images/my-lindway-description-list-2.webp"
        title1_image3="/images/my-lindway-description-list-3.webp"
        title2_image1="/images/lure-by-lindway-description-list-1.webp"
        title2_image2="/images/lure-by-lindway-description-list-2.webp"
        title2_image3="/images/lure-by-lindway-description-list-3.webp"
      />
    </div>
  );
};
