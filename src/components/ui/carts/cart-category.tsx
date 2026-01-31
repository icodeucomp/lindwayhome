import { categoryColors, categoryLabels } from "@/static/categories";
import { CartItems } from "./cart-items";
import { ProductCartItems } from "@/types";

interface CartCategoryProps {
  category: string;
  products: ProductCartItems[];
  isSelected: boolean;
  isPartiallySelected: boolean;
  selectedItems: Set<string>;
  onToggleCategory: () => void;
  onToggleItem: (id: string, size: string) => void;
  onUpdateQuantity: (id: string, size: string, quantity: number) => void;
  onRemoveItem: (id: string, size: string) => void;
}

export const CartCategory = ({ category, products, isSelected, isPartiallySelected, selectedItems, onToggleCategory, onToggleItem, onUpdateQuantity, onRemoveItem }: CartCategoryProps) => {
  return (
    <div className="overflow-hidden text-sm rounded-lg bg-light text-gray">
      <div className="p-4 border-b border-gray/30">
        <div className="hidden grid-cols-12 gap-4 lg:grid">
          <div className="col-span-1">
            <input
              type="checkbox"
              className="rounded size-4 accent-primary"
              checked={isSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = isPartiallySelected;
                }
              }}
              onChange={onToggleCategory}
            />
          </div>
          <div className="flex items-center col-span-4 space-x-2">
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${categoryColors[category as keyof typeof categoryColors]}`}>{categoryLabels[category as keyof typeof categoryLabels]}</span>
            <span className="text-sm text-gray">
              ({products.length} item{products.length > 1 ? "s" : ""})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="rounded size-4 accent-primary"
              checked={isSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = isPartiallySelected;
                }
              }}
              onChange={onToggleCategory}
            />
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${categoryColors[category as keyof typeof categoryColors]}`}>{categoryLabels[category as keyof typeof categoryLabels]}</span>
          </div>
          <span className="text-sm text-gray">
            {products.length} item{products.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray/10">
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
    </div>
  );
};
