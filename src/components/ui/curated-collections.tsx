"use client";

import * as React from "react";

import { Container, Motion } from "@/components";

import { CardProduct } from "./card-product";
import { VideoCarousel } from "./video-carousel";

import { productsApi } from "@/utils";

import { ApiResponse, Product } from "@/types";

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
    key: ["products", page],
    params: { page, limit, isActive: true, isFavorite: true, order: "desc" },
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

      <div className="flex flex-col items-center justify-center h-16 space-y-2">
        {isLoading && page > 1 && (
          <div className="flex items-center justify-center py-8">
            <div className="loader"></div>
          </div>
        )}

        {!isLoading && hasMore && (
          <div className="flex justify-center text-gray">
            <button onClick={handleLoadMore} disabled={isLoading} className="block pb-1 text-lg font-medium border-b border-gray w-max">
              Discover More
            </button>
          </div>
        )}

        {!isLoading && !hasMore && allProducts.length > 0 && <div className="py-4 text-center text-gray">No more product</div>}
      </div>
    </div>
  );
};

export const CuratedCollections = () => {
  return (
    <Container className="pt-10 space-y-4 sm:space-y-8">
      <div className="space-y-2 text-center sm:space-y-4 text-gray">
        <Motion tag="h1" initialY={50} animateY={0} duration={0.5} className="heading">
          Curated Collections
        </Motion>
        <Motion tag="p" initialY={50} animateY={0} duration={0.5} delay={0.2} className="text-sm sm:text-base">
          Each piece in our collection is thoughtfully curated to celebrate the richness of Indonesia&apos;s cultural heritage. Crafted on a made-to-order basis, our flagship designs embrace the art
          of slow fashion—honoring quality, individuality, and intentionality. From intricate embroidery and hand-painted fabrics to delicate sequin artistry, every My Lindway creation is a personal
          expression of elegance.
        </Motion>
      </div>
      <Motion tag="div" initialX={0} animateX={0} duration={0.5} delay={0.3} className="relative flex-1 h-full gap-4">
        <div className="relative w-full h-auto">
          <VideoCarousel />
        </div>
      </Motion>
      <Motion tag="h3" initialY={50} animateY={0} duration={0.5} delay={0.4} className="py-4 text-base font-medium text-center sm:text-xl md:text-2xl lg:text-3xl text-gray">
        “Whether you&apos;re seeking a handcrafted statement piece, everyday comfort for your family, or refined modern wear inspired by tradition—Lindway offers a curated universe where heritage
        meets innovation.”
      </Motion>

      <ProductDetail />
    </Container>
  );
};
