import { FaMinus, FaPlus, FaTrash } from "react-icons/fa";

import { Img } from "@/components";

import { formatIDR } from "@/utils";

import { ProductCartItems } from "@/types";

interface CartItemProps {
  product: ProductCartItems;
  isSelected: boolean;
  onToggleItem: (id: string, size: string) => void;
  onUpdateQuantity: (id: string, size: string, quantity: number) => void;
  onRemoveItem: (id: string, size: string) => void;
}

export const CartItems = ({ product, isSelected, onToggleItem, onUpdateQuantity, onRemoveItem }: CartItemProps) => {
  return (
    <>
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center lg:p-4 lg:transition-colors lg:hover:bg-gray/5">
        <div className="col-span-1">
          <input type="checkbox" className="rounded size-4 accent-primary" checked={isSelected} onChange={() => onToggleItem(product.id, product.selectedSize)} />
        </div>

        <div className="col-span-4">
          <div className="flex items-center gap-4">
            <Img src={product.images[0].path} alt={product.name} className="shrink-0 object-cover w-20 h-20 rounded-lg" />
            <div className="flex-1 min-w-0">
              <h3 className="mb-2 text-sm font-medium text-gray line-clamp-2">{product.name}</h3>
              <p className="text-xs text-gray/70">Size: {product.selectedSize}</p>
            </div>
          </div>
        </div>

        <div className="col-span-2 text-center">
          <span className="font-medium text-gray">{formatIDR(product.price)}</span>
        </div>

        <div className="col-span-2">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onUpdateQuantity(product.id, product.selectedSize, product.quantity - 1)}
              className="flex items-center justify-center w-8 h-8 transition-colors border rounded border-gray/30 hover:bg-gray/10 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={product.quantity <= 1}
              aria-label="Decrease quantity"
            >
              <FaMinus size={12} />
            </button>
            <span className="w-12 text-sm font-medium text-center">{product.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(product.id, product.selectedSize, product.quantity + 1)}
              className="flex items-center justify-center w-8 h-8 transition-colors border rounded border-gray/30 hover:bg-gray/10"
              aria-label="Increase quantity"
            >
              <FaPlus size={12} />
            </button>
          </div>
        </div>

        <div className="col-span-2 text-center">
          <span className="font-semibold text-gray">{formatIDR(product.price * product.quantity)}</span>
        </div>

        <div className="col-span-1 text-center">
          <button
            onClick={() => onRemoveItem(product.id, product.selectedSize)}
            className="flex items-center justify-center gap-1 p-1 text-sm text-red-500 transition-colors rounded hover:text-red-700 hover:bg-red-50"
            title="Remove item"
          >
            <FaTrash size={12} />
          </button>
        </div>
      </div>

      <div className="p-4 lg:hidden">
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-3">
            <input type="checkbox" className="rounded size-4 accent-primary" checked={isSelected} onChange={() => onToggleItem(product.id, product.selectedSize)} />
            <Img src={product.images[0].path} alt={product.name} className="shrink-0 object-cover w-20 h-20 rounded-lg" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 pr-2">
                <h3 className="mb-1 text-sm font-medium text-gray line-clamp-2">{product.name}</h3>
                <p className="mb-2 text-xs text-gray/70">Size: {product.selectedSize}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray">{formatIDR(product.price)}</span>
                  <button onClick={() => onRemoveItem(product.id, product.selectedSize)} className="p-2 text-red-500 transition-colors rounded hover:text-red-700 hover:bg-red-50" title="Remove item">
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray/20">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(product.id, product.selectedSize, product.quantity - 1)}
                  className="flex items-center justify-center w-8 h-8 transition-colors border rounded border-gray/30 hover:bg-gray/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={product.quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <FaMinus size={10} />
                </button>
                <span className="w-8 text-sm font-medium text-center">{product.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(product.id, product.selectedSize, product.quantity + 1)}
                  className="flex items-center justify-center w-8 h-8 transition-colors border rounded border-gray/30 hover:bg-gray/10"
                  aria-label="Increase quantity"
                >
                  <FaPlus size={10} />
                </button>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray/70">Total</p>
                <span className="text-sm font-semibold text-gray">{formatIDR(product.price * product.quantity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
