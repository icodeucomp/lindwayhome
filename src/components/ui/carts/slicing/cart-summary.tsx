import { FaTrash } from "react-icons/fa";

import { Button } from "@/components";

import { formatIDR } from "@/utils";

import { ProductCartItems } from "@/types";

interface CartSummaryProps {
  cart: ProductCartItems[];
  selectedCount: number;
  selectedTotal: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onRemoveSelected: () => void;
  onBuyNow: () => void;
}

export const CartSummary = ({ cart, selectedCount, selectedTotal, isAllSelected, onSelectAll, onRemoveSelected, onBuyNow }: CartSummaryProps) => {
  return (
    <div className="flex flex-col justify-between gap-2 p-4 mt-6 rounded-lg md:gap-0 sm:p-6 md:items-center md:flex-row bg-light text-gray">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <input type="checkbox" className="rounded size-4 accent-primary" checked={isAllSelected} onChange={onSelectAll} />
          <span className="text-sm font-medium">Select All ({cart.length})</span>
        </div>

        {selectedCount > 0 && (
          <button onClick={onRemoveSelected} className="flex items-center gap-2 px-3 py-1 text-sm text-red-500 transition-colors rounded hover:text-red-700 hover:bg-red-50">
            <FaTrash size={12} />
            <span>
              Delete <span className="hidden sm:inline-block">Selected</span> ({selectedCount})
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-6">
        <div className="text-left md:text-right">
          <div className="text-xs sm:text-sm text-gray/70">
            Total ({selectedCount} item{selectedCount !== 1 ? "s" : ""}):
          </div>
          <div className="text-sm font-bold md:text-lg lg:text-xl">{formatIDR(selectedTotal)}</div>
        </div>

        <Button
          type="button"
          onClick={onBuyNow}
          disabled={selectedCount === 0}
          className={`font-medium transition-all ${selectedCount === 0 ? "btn-outline opacity-50 cursor-not-allowed" : "btn-gray hover:scale-105"}`}
        >
          {selectedCount === 0 ? "Select Items" : `Buy Now (${selectedCount})`}
        </Button>
      </div>
    </div>
  );
};
