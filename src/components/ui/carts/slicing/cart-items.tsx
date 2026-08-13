"use client";

import { Img } from "@/components";

import { IMAGE_FALLBACK } from "@/components/ui/storefront";

import { formatIDR, hasDiscount, resolveLineTotal, resolveListPrice, resolveUnitPrice } from "@/utils";

import { ProductCartItems } from "@/types";

import { PiMinus, PiPlus, PiTrash } from "react-icons/pi";

/**
 * One cart line, in the same visual language as the cart drawer
 * (`storefront/cart-drawer.tsx`) — hairline separators, square controls, no cards.
 *
 * The price shown is `discountedPrice` with the list price struck through beside it,
 * matching ProductCard and the drawer. Showing `price` here, as an earlier build did,
 * meant a discounted line disagreed with the subtotal underneath it.
 *
 * The image reads `url`, not `path`: `path` is where the file sits on disk for
 * `resolveFiles` to move and delete, and is not a browser-resolvable address.
 */

interface CartItemsProps {
  product: ProductCartItems;
  isSelected: boolean;
  onToggleItem: (id: string, size: string) => void;
  onUpdateQuantity: (id: string, size: string, quantity: number) => void;
  onRemoveItem: (id: string, size: string) => void;
}

const QuantityStepper = ({ product, onUpdateQuantity }: Pick<CartItemsProps, "product" | "onUpdateQuantity">) => (
  <div className="flex items-center border border-border w-max">
    <button
      type="button"
      onClick={() => onUpdateQuantity(product.id, product.selectedSize, product.quantity - 1)}
      disabled={product.quantity <= 1}
      aria-label="Decrease quantity"
      className="grid size-9 place-items-center text-body hover:text-primary disabled:opacity-35 disabled:hover:text-body hover:cursor-pointer"
    >
      <PiMinus className="size-3" />
    </button>
    <span className="w-10 text-sm text-center text-body tabular-nums">{product.quantity}</span>
    <button
      type="button"
      onClick={() => onUpdateQuantity(product.id, product.selectedSize, product.quantity + 1)}
      aria-label="Increase quantity"
      className="grid size-9 place-items-center text-body hover:text-primary hover:cursor-pointer"
    >
      <PiPlus className="size-3" />
    </button>
  </div>
);

export const CartItems = ({ product, isSelected, onToggleItem, onUpdateQuantity, onRemoveItem }: CartItemsProps) => {
  const unitPrice = resolveUnitPrice(product);
  const listPrice = resolveListPrice(product);
  const discounted = hasDiscount(product);

  const checkbox = (
    <input
      type="checkbox"
      className="mt-1 rounded-none size-4 shrink-0 accent-primary hover:cursor-pointer"
      checked={isSelected}
      onChange={() => onToggleItem(product.id, product.selectedSize)}
      aria-label={`Select ${product.name}`}
    />
  );

  const remove = (
    <button type="button" onClick={() => onRemoveItem(product.id, product.selectedSize)} aria-label={`Remove ${product.name}`} className="transition-colors text-body/50 hover:text-primary hover:cursor-pointer">
      <PiTrash className="size-4" />
    </button>
  );

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      {/* Desktop — the columns line up with the header row above. */}
      <div className="items-start hidden grid-cols-12 gap-4 lg:grid">
        <div className="col-span-1">{checkbox}</div>

        <div className="flex col-span-4 gap-4">
          <Img src={product.images?.[0]?.url ?? IMAGE_FALLBACK} alt={product.name} className="w-20 shrink-0 aspect-3/4 bg-footer/30" cover />
          <div className="space-y-1">
            <p className="text-sm uppercase font-heading text-body tracking-[0.04em]">{product.name}</p>
            <p className="text-xs text-body/70">Size {product.selectedSize}</p>
          </div>
        </div>

        <div className="col-span-2 text-sm text-center">
          <p className="text-body">{formatIDR(unitPrice)}</p>
          {discounted && <p className="text-xs line-through text-body/45">{formatIDR(listPrice)}</p>}
        </div>

        <div className="flex justify-center col-span-2">
          <QuantityStepper product={product} onUpdateQuantity={onUpdateQuantity} />
        </div>

        <p className="col-span-2 text-sm text-center font-heading text-body">{formatIDR(resolveLineTotal(product, product.quantity))}</p>

        <div className="flex justify-center col-span-1">{remove}</div>
      </div>

      {/* Mobile — the same fields, stacked. */}
      <div className="flex gap-4 lg:hidden">
        {checkbox}

        <Img src={product.images?.[0]?.url ?? IMAGE_FALLBACK} alt={product.name} className="w-20 shrink-0 aspect-3/4 bg-footer/30" cover />

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm uppercase font-heading text-body tracking-[0.04em] line-clamp-2">{product.name}</p>
              <p className="text-xs text-body/70">Size {product.selectedSize}</p>
            </div>
            {remove}
          </div>

          <div className="flex items-baseline gap-2 text-sm">
            <span className="text-body">{formatIDR(unitPrice)}</span>
            {discounted && <span className="text-xs line-through text-body/45">{formatIDR(listPrice)}</span>}
          </div>

          <div className="flex items-center justify-between gap-3">
            <QuantityStepper product={product} onUpdateQuantity={onUpdateQuantity} />
            <span className="text-sm font-heading text-body">{formatIDR(resolveLineTotal(product, product.quantity))}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
