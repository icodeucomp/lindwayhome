"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useCartStore } from "@/hooks";

import toast from "react-hot-toast";

import { Container, Button } from "@/components";

import { CartCategory, CartHeader, CartSummary, OrderSummary } from "@/components/ui/carts";

import { FaShoppingCart } from "react-icons/fa";

export const CartProduct = () => {
  const router = useRouter();
  const {
    cart,
    selectedItems,
    toggleItemSelection,
    toggleCategorySelection,
    selectAllItems,
    deselectAllItems,
    getSelectedTotal,
    getSelectedCount,
    isCategorySelected,
    isCategoryPartiallySelected,
    removeSelectedItems,
    updateQuantity,
    removeFromCart,
  } = useCartStore();

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [isHydrated, setIsHydrated] = React.useState<boolean>(false);

  const cartItems = React.useMemo(() => {
    return Object.entries(
      cart.reduce((acc, product) => {
        const category = product.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {} as Record<string, typeof cart>)
    );
  }, [cart]);

  const handleBuyNow = React.useCallback(() => {
    if (getSelectedCount() === 0) {
      toast.error("Please select at least one item to proceed.");
      return;
    }
    setIsModalOpen(true);
  }, [getSelectedCount]);

  const handleRemoveSelected = React.useCallback(() => {
    if (!window.confirm("Are you sure you want to delete selected items?")) return;
    removeSelectedItems();
    toast.success("Selected items removed from cart");
  }, [removeSelectedItems]);

  const handleRemoveItem = React.useCallback(
    (id: string, size: string) => {
      if (!window.confirm("Remove this item from cart?")) return;
      removeFromCart(id, size);
      toast.success("Item removed from cart");
    },
    [removeFromCart]
  );

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="loader"></div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <Container className="py-10">
        <div className="p-4 mb-4 text-center rounded-lg sm:p-8 bg-light">
          <div className="flex flex-col items-center space-y-4">
            <FaShoppingCart className="text-4xl sm:text-6xl text-gray/50" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium sm:text-xl text-darker-gray">Your cart is empty</h3>
              <p className="text-sm sm:text-base text-gray/70">Add some products to get started</p>
            </div>
            <Button type="button" onClick={() => router.push("/my-lindway")} className="px-6 py-2 mt-4 rounded-lg bg-primary hover:bg-primary/90 text-light">
              Continue Shopping
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  const isAllSelected = cart.length > 0 && selectedItems.size === cart.length;
  const selectedCount = getSelectedCount();
  const selectedTotal = getSelectedTotal();

  return (
    <Container className="py-6 sm:py-10">
      <OrderSummary isVisible={isModalOpen} onClose={() => setIsModalOpen(false)} price={selectedTotal} totalItem={selectedCount} />

      <CartHeader
        cart={cart}
        isAllSelected={isAllSelected}
        onSelectAll={() => {
          if (isAllSelected) {
            deselectAllItems();
          } else {
            selectAllItems();
          }
        }}
      />

      <div className="space-y-4 sm:space-y-6">
        {cartItems.map(([category, products]) => (
          <CartCategory
            key={category}
            category={category}
            products={products}
            isSelected={isCategorySelected(category)}
            isPartiallySelected={isCategoryPartiallySelected(category)}
            selectedItems={selectedItems}
            onToggleCategory={() => toggleCategorySelection(category)}
            onToggleItem={toggleItemSelection}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={handleRemoveItem}
          />
        ))}
      </div>

      <CartSummary
        cart={cart}
        selectedCount={selectedCount}
        selectedTotal={selectedTotal}
        isAllSelected={isAllSelected}
        onSelectAll={() => {
          if (isAllSelected) {
            deselectAllItems();
          } else {
            selectAllItems();
          }
        }}
        onRemoveSelected={handleRemoveSelected}
        onBuyNow={handleBuyNow}
      />
    </Container>
  );
};
