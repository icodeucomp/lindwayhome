"use client";

import { ProductCartItems } from "@/types";

/**
 * The column header above the cart lines, and its mobile equivalent.
 *
 * Uppercase letterspaced micro-labels over a hairline, the same treatment the admin
 * tables use — a cart is a table, and pretending otherwise costs the reader the column
 * alignment that makes quantities and totals scannable.
 */

interface CartHeaderProps {
  cart: ProductCartItems[];
  isAllSelected: boolean;
  onSelectAll: () => void;
}

const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`font-heading text-xxs uppercase tracking-[0.16em] text-body/55 ${className ?? ""}`}>{children}</div>
);

export const CartHeader = ({ cart, isAllSelected, onSelectAll }: CartHeaderProps) => (
  <>
    <div className="hidden grid-cols-12 gap-4 pb-4 lg:grid">
      <div className="col-span-1">
        <input type="checkbox" className="rounded-none size-4 accent-primary" checked={isAllSelected} onChange={onSelectAll} aria-label="Select all items" />
      </div>
      <Th className="col-span-4">Product</Th>
      <Th className="col-span-2 text-center">Price</Th>
      <Th className="col-span-2 text-center">Quantity</Th>
      <Th className="col-span-2 text-center">Total</Th>
      <Th className="col-span-1 text-center">Remove</Th>
    </div>

    <div className="flex items-center justify-between pb-4 lg:hidden">
      <label className="flex items-center gap-2">
        <input type="checkbox" className="rounded-none size-4 accent-primary" checked={isAllSelected} onChange={onSelectAll} />
        <span className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Select All</span>
      </label>
      <span className="text-xs text-body/60">
        {cart.length} item{cart.length > 1 ? "s" : ""}
      </span>
    </div>
  </>
);
