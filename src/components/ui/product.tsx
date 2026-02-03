"use client";

import * as React from "react";

import Link from "next/link";

import { useCartStore } from "@/hooks";

import { Button, Container, Img, Motion } from "@/components";

import { CardProduct } from "./card-product";

import toast from "react-hot-toast";

import { MdOutlineArrowBackIos } from "react-icons/md";
import { SlArrowDown, SlArrowLeft, SlArrowRight, SlArrowUp } from "react-icons/sl";
import { PiWarningCircleLight } from "react-icons/pi";

import { formatIDR, formatDashToSpace, formatDashToUnderscore, productsApi } from "@/utils";

import { ApiResponse, Product } from "@/types";

export const ProductDetail = ({ id, category }: { id: string; category: string }) => {
  const { addToCart } = useCartStore();
  const { data: product, isLoading: loadProduct, error: errorProduct } = productsApi.useGetProduct<ApiResponse<Product>>({ key: ["product", id], id });

  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [hasMore, setHasMore] = React.useState<boolean>(true);
  const [selectedSize, setSelectedSize] = React.useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = React.useState<number>(0);
  const [thumbnailStartIndex, setThumbnailStartIndex] = React.useState<number>(0);

  const maxVisibleScroll = 3;
  const limit = 6;

  const {
    data: products,
    isLoading: loadProducts,
    isError: errorProducts,
  } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["products", formatDashToUnderscore(category), page],
    params: { category: formatDashToUnderscore(category), limit, page, isActive: true, order: "desc" },
  });

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
  };

  const handleAddToCart = () => {
    if (selectedSize === "") {
      toast.error("Please choose the size first");
      return;
    }
    addToCart(id, product?.data as Product, 1, selectedSize);
    toast.success(`${product?.data.name} has been added to your cart with size ${selectedSize}.`);
  };

  const updateThumbnailView = (selectedIndex: number) => {
    const totalImages = product?.data.images.length || 0;
    if (totalImages <= maxVisibleScroll) {
      setThumbnailStartIndex(0);
      return;
    }
    if (selectedIndex >= thumbnailStartIndex + maxVisibleScroll) {
      setThumbnailStartIndex(selectedIndex - maxVisibleScroll + 1);
    } else if (selectedIndex < thumbnailStartIndex) {
      setThumbnailStartIndex(selectedIndex);
    }
  };

  const selectImage = (index: number) => {
    setCurrentImageIndex(index);
    updateThumbnailView(index);
  };

  const scrollThumbnailsUp = () => {
    if (thumbnailStartIndex > 0) {
      setThumbnailStartIndex(thumbnailStartIndex - 1);
    }
  };

  const scrollThumbnailsDown = () => {
    const totalImages = product?.data.images.length || 0;
    if (thumbnailStartIndex + maxVisibleScroll < totalImages) {
      setThumbnailStartIndex(thumbnailStartIndex + 1);
    }
  };

  React.useEffect(() => {
    if (products?.data) {
      if (page === 1) {
        setAllProducts(products.data);
      } else {
        setAllProducts((prev) => [...prev, ...products.data]);
      }

      const totalLoaded = page * limit;
      setHasMore(totalLoaded < products.pagination.total);
    }
  }, [products, page, limit]);

  const handleLoadMore = React.useCallback(() => {
    if (!loadProducts && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [loadProducts, hasMore]);

  if (loadProduct) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="loader"></div>
      </div>
    );
  }

  if (errorProduct) {
    return <div className="px-4 py-3 mt-16 text-center text-red-700 border border-red-200 rounded-lg bg-red-50">Error loading products. Please try again.</div>;
  }

  return (
    <Container className="pt-10">
      <div className="relative flex items-center justify-center pt-8 pb-4 sm:py-6">
        <button className="absolute top-0 left-0 flex items-center gap-2 transition-colors sm:-translate-y-1/2 sm:top-1/2 text-gray hover:text-darker-gray">
          <MdOutlineArrowBackIos />
          Back
        </button>
        <nav className="text-base sm:text-lg text-gray">
          <Link href={`/${category}`} className="text-darker-gray">
            {formatDashToSpace(category)}
          </Link>
          <span className="mx-2">/</span>
          {product && <span className="text-gray/50">{product.data.name}</span>}
        </nav>
      </div>

      {product && product.data.images && (
        <div className="flex flex-col w-full gap-8 lg:flex-row">
          <Motion tag="div" initialY={50} animateY={0} duration={0.2} className="flex flex-col w-full max-w-2xl gap-4 mx-auto sm:flex-row lg:mx-0 sm:gap-8">
            <div className="relative flex items-center justify-center w-full overflow-hidden rounded-lg bg-gray/20">
              <Img src={product.data.images[currentImageIndex].path} alt="Thumbnail Image" className="w-full h-full aspect-3/4" cover />

              <div className="absolute px-2 py-1 text-sm bg-opacity-50 rounded bg-dark text-light bottom-4 left-4">
                {currentImageIndex + 1} / {product.data.images.length}
              </div>
            </div>

            <div className="flex flex-row items-center w-full max-w-full sm:flex-col sm:max-w-40">
              <button onClick={scrollThumbnailsUp} className="order-1 sm:p-2 sm:order-1" disabled={thumbnailStartIndex === 0}>
                <SlArrowUp className={`size-6 hidden sm:block ${thumbnailStartIndex === 0 ? "text-gray/20" : "text-dark"}`} />
                <SlArrowLeft className={`size-4 sm:size-6 sm:hidden ${thumbnailStartIndex === 0 ? "text-gray/20" : "text-dark"}`} />
              </button>

              <div className="grid order-2 w-full h-full grid-cols-3 grid-rows-1 gap-1 p-2 overflow-hidden sm:grid-rows-3 sm:grid-cols-1 sm:gap-2 sm:order-2">
                {product.data.images.slice(thumbnailStartIndex, thumbnailStartIndex + maxVisibleScroll).map((image, displayIndex) => {
                  const actualIndex = thumbnailStartIndex + displayIndex;
                  return (
                    <button
                      key={displayIndex}
                      onClick={() => selectImage(actualIndex)}
                      className={`w-full h-full rounded-lg overflow-hidden ${currentImageIndex === actualIndex ? "border-2 border-gray" : "border-none"}`}
                    >
                      <Img src={image.url} alt={image.alt} className="aspect-3/4 sm:aspect-4/3 w-full h-full" cover />
                    </button>
                  );
                })}
              </div>

              <button onClick={scrollThumbnailsDown} className="order-3 sm:p-2 sm:order-3" disabled={thumbnailStartIndex + maxVisibleScroll >= product.data.images.length}>
                <SlArrowDown className={`size-6 hidden sm:block ${thumbnailStartIndex + maxVisibleScroll >= product.data.images.length ? "text-gray/20" : "text-dark"}`} />
                <SlArrowRight className={`size-4 sm:size-6 sm:hidden ${thumbnailStartIndex + maxVisibleScroll >= product.data.images.length ? "text-gray/20" : "text-dark"}`} />
              </button>
            </div>
          </Motion>

          <Motion tag="div" initialY={50} animateY={0} duration={0.4} delay={0.2} className="w-full max-w-md mx-auto space-y-4 lg:mx-0 lg:max-w-xs xl:max-w-md sm:space-y-6">
            <div className="space-y-2 text-gray">
              <p className="text-sm">{formatDashToSpace(category)}</p>
              <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-start">
                <h1 className="heading">{product.data.name}</h1>
                {product.data.isPreOrder && <span className="inline-block px-2 py-1 text-xs rounded bg-darker-gray text-light">Pre-Order</span>}
              </div>
            </div>

            <div className="flex flex-col items-start gap-0 sm:flex-row sm:gap-2">
              <span className="text-2xl font-medium text-gray">{formatIDR(product.data.discountedPrice)}</span>
              <span className="text-lg line-through text-gray/30">{formatIDR(product.data.price)}</span>
            </div>

            <div className="mb-6 space-y-2 sm:space-y-4">
              <div className="flex items-start justify-between gap-4 sm:justify-start">
                <p className="text-sm font-medium text-gray">Size</p>
                <Link href="/size-guide" className="text-sm text-blue-500 underline hover:text-blue-700">
                  Size Guide
                </Link>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {product.data.sizes.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSizeSelect(item.size)}
                    className={`relative border-2 rounded py-2 px-3 text-sm text-gray ${
                      selectedSize === item.size ? "border-gray bg-gray/10" : item.quantity > 0 ? "border-gray/30 bg-light" : "border-gray/10 bg-gray/5 text-light cursor-not-allowed"
                    }`}
                    disabled={item.quantity === 0}
                  >
                    {item.size}
                    {item.quantity <= 0 && <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs px-1 py-0.5 rounded-full">Out</span>}
                  </button>
                ))}
              </div>
              {selectedSize && (
                <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-gray/10 border-gray/30 text-gray">
                  <div className="rounded-full size-2 bg-gray"></div>
                  <span className="text-sm font-medium">
                    Size {selectedSize} - {product.data.sizes.find((s) => s.size === selectedSize)?.quantity} items in stock
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={!selectedSize}
              className={`flex items-center justify-center w-full gap-2 ${selectedSize ? "btn-gray" : "bg-gray/50 text-light cursor-not-allowed"}`}
            >
              <Img src="/icons/cart-light.svg" alt="car light" className="size-6" />
              Add to Cart
            </Button>

            <div className="space-y-0 sm:space-y-2">
              <h3 className="text-base font-medium sm:text-lg text-gray">Description</h3>
              <p className="text-sm leading-relaxed text-gray">{product.data.description}</p>
            </div>

            <div className="space-y-0 sm:space-y-2">
              <h3 className="text-base font-medium sm:text-lg text-gray">Note</h3>
              <p className="text-sm text-gray">* {product.data.notes}</p>
              <div className="flex items-center gap-2 text-sm text-gray">
                <PiWarningCircleLight size={30} className="shrink-0 text-gray" />
                <div>
                  <p>{product.data.productionNotes}</p>
                  <Link href="/shop" className="block text-blue-500 underline hover:text-blue-700">
                    Learn How to Shop
                  </Link>
                </div>
              </div>
            </div>
          </Motion>
        </div>
      )}

      {errorProducts ? (
        <div className="p-4 py-16 text-center text-red-600">Error loading products. Please try again.</div>
      ) : (
        <div className="pt-12 space-y-6 sm:space-y-8">
          <Motion tag="h4" initialY={50} animateY={0} duration={0.2} className="text-center heading">
            The Collections of {formatDashToSpace(category)}
          </Motion>
          {loadProducts && page === 1 ? (
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
            {loadProducts && page > 1 && (
              <div className="flex items-center justify-center py-8">
                <div className="loader"></div>
              </div>
            )}

            {!loadProducts && hasMore && (
              <div className="flex justify-center text-gray">
                <button onClick={handleLoadMore} disabled={loadProducts} className="block pb-1 text-lg font-medium border-b border-gray w-max">
                  Discover More
                </button>
              </div>
            )}

            {!loadProducts && !hasMore && allProducts.length > 0 && <div className="py-4 text-center text-gray">No more product</div>}
          </div>
        </div>
      )}
    </Container>
  );
};
