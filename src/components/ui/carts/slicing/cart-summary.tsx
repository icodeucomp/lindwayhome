"use client";

import { StoreButton } from "@/components/ui/storefront";

import { formatIDR } from "@/utils";

import { ProductCartItems } from "@/types";

import { PiTrash } from "react-icons/pi";

/**
 * The action bar under the cart lines.
 *
 * Sticky at the bottom of the viewport: the cart can run past a screenful, and a total
 * the reader has to scroll back to is a total they stop trusting.
 *
 * The figure here is the *selected* subtotal, before tax and shipping. It is
 * deliberately labelled as such — the binding number is the one the server signs at
 * checkout (§A5.2), and a bare "Total" here would be contradicted a step later.
 */

interface CartSummaryProps {
  cart: ProductCartItems[];
  selectedCount: number;
  selectedTotal: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onRemoveSelected: () => void;
  onBuyNow: () => void;
}

export const CartSummary = ({ cart, selectedCount, selectedTotal, isAllSelected, onSelectAll, onRemoveSelected, onBuyNow }: CartSummaryProps) => (
  <div className="sticky bottom-0 z-10 mt-8 border-t bg-light border-border">
    <div className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="rounded-none size-4 accent-primary" checked={isAllSelected} onChange={onSelectAll} />
          <span className="font-heading text-xxs uppercase tracking-[0.16em] text-body/70">Select All ({cart.length})</span>
        </label>

        {selectedCount > 0 && (
          <button type="button" onClick={onRemoveSelected} className="flex items-center gap-2 text-xs transition-colors text-body/60 hover:text-primary">
            <PiTrash className="size-4" />
            Remove ({selectedCount})
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-6">
        <div className="text-right">
          <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">
            Subtotal · {selectedCount} item{selectedCount === 1 ? "" : "s"}
          </p>
          <p className="text-2xl font-heading text-body">{formatIDR(selectedTotal)}</p>
          <p className="text-xxs text-body/50">Tax and shipping calculated at checkout</p>
        </div>

        <StoreButton onClick={onBuyNow} disabled={selectedCount === 0}>
          {selectedCount === 0 ? "Select Items" : "Checkout"}
        </StoreButton>
      </div>
    </div>
  </div>
);
