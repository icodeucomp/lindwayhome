"use client";

import { brandByKey, type BrandType } from "@/static/taxonomy";

import { CartItems } from "./cart-items";

import { ProductCartItems } from "@/types";

/**
 * One brand's worth of cart lines (F-8).
 *
 * The brand heading is an uppercase letterspaced eyebrow rather than a pill, matching
 * how every other storefront section labels a group.
 *
 * The group checkbox carries three states: checked, unchecked, and indeterminate when
 * only some of its lines are selected. `indeterminate` is a DOM property with no HTML
 * attribute, so it can only be set through a ref — React will not render it from JSX.
 */

interface CartCategoryProps {
  brand: string;
  products: ProductCartItems[];
  isSelected: boolean;
  isPartiallySelected: boolean;
  selectedItems: Set<string>;
  onToggleCategory: () => void;
  onToggleItem: (id: string, size: string) => void;
  onUpdateQuantity: (id: string, size: string, quantity: number) => void;
  onRemoveItem: (id: string, size: string) => void;
}

export const CartCategory = ({ brand, products, isSelected, isPartiallySelected, selectedItems, onToggleCategory, onToggleItem, onUpdateQuantity, onRemoveItem }: CartCategoryProps) => {
  const label = brandByKey(brand as BrandType)?.label ?? brand;

  return (
    <section className="border-t border-border">
      <div className="flex items-center gap-3 py-5">
        <input
          type="checkbox"
          className="rounded-none size-4 accent-primary hover:cursor-pointer"
          checked={isSelected}
          ref={(input) => {
            if (input) input.indeterminate = isPartiallySelected;
          }}
          onChange={onToggleCategory}
          aria-label={`Select all ${label} items`}
        />
        <p className="font-heading text-sm uppercase tracking-[0.14em] text-primary">{label}</p>
        <span className="text-xs text-body/60">
          {products.length} item{products.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="border-t border-border">
        {products.map((product) => (
          <CartItems
            key={`${product.id}-${product.selectedSize}`}
            product={product}
            isSelected={selectedItems.has(`${product.id}-${product.selectedSize}`)}
            onToggleItem={onToggleItem}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
          />
        ))}
      </div>
    </section>
  );
};
