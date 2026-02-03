import Link from "next/link";

import { ImageSlider } from "@/components";

import { PiWarningCircleLight } from "react-icons/pi";

import { categoryColors } from "@/static/categories";

import { formatIDR, formatUnderscoreToDash, formatUnderscoreToSpace } from "@/utils";

import { Product } from "@/types";

type exception = "createdAt" | "updatedAt" | "isActive" | "discount" | "image" | "size" | "sku" | "stock" | "description" | "sizes" | "isFavorite" | "isActive";

export const CardProduct = ({ discountedPrice, images, name, price, notes, productionNotes, isPreOrder, category, id }: Omit<Product, exception>) => {
  return (
    <div className="w-full mx-auto space-y-2 shadow max-w-96">
      <ImageSlider images={images.map((image) => image.url)} alt={name} showProgressBar={false} showCounter={false} autoPlay={false}>
        {isPreOrder && <div className="absolute top-0 left-0 px-4 py-2 text-xs bg-gray text-light sm:text-sm">Pre Order</div>}
        <div className={`absolute top-0 right-0 px-4 py-2 text-xs sm:text-sm ${categoryColors[category as keyof typeof categoryColors]}`}>{formatUnderscoreToSpace(category)}</div>
      </ImageSlider>
      <div className="p-2 space-y-2 sm:space-y-4 text-gray">
        <div className="space-y-2">
          <Link href={`/product/${formatUnderscoreToDash(category)}/${id}`} className="block text-lg font-medium sm:text-xl w-max hover:text-darker-gray hover:font-semibold">
            {name}
          </Link>
          <div className="flex items-center justify-between text-lg font-light sm:text-xl">
            <p>{formatIDR(+discountedPrice)}</p>
            <p className="line-through text-gray/50">{formatIDR(+price)}</p>
          </div>
        </div>
        <p className="text-xs sm:h-10 sm:text-sm sm:line-clamp-2">*{notes}</p>
        <div className="flex gap-2">
          <PiWarningCircleLight size={22} className="text-gray" />
          <p className="text-xs sm:text-sm">
            {productionNotes} <br />{" "}
            <Link href="/shop" className="underline w-max">
              Learn how to shop
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
