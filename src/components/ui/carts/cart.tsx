"use client";

import * as React from "react";

import { useCartStore, useIsHydrated } from "@/hooks";

import toast from "react-hot-toast";

import { OrderSummary } from "./order-summary";

import { CartCategory, CartHeader, CartSummary } from "./slicing";

import { Container } from "@/components";

import { Breadcrumb, SectionHeading, StoreEmptyState, StoreLinkButton, StoreSkeletonGrid } from "@/components/ui/storefront";

/**
 * The cart page (F-8). Lines are grouped by brand, only *selected* lines check out, and
 * nothing here is stored server-side — the cart lives in localStorage until the order is
 * created (F-6).
 *
 * Checkout itself opens as a modal wizard (`OrderSummary`), which is where the address
 * form, the shipping quote and the signed token live. None of that moved (D8); this file
 * only decides what is selected and hands over the count and the subtotal.
 */
export const CartProduct = () => {
  const {
    cart,
    selectedItems,
    toggleItemSelection,
    toggleBrandSelection,
    selectAllItems,
    deselectAllItems,
    getSelectedTotal,
    getSelectedCount,
    isBrandSelected,
    isBrandPartiallySelected,
    removeSelectedItems,
    updateQuantity,
    removeFromCart,
  } = useCartStore();

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  // Cart lives in localStorage, so the first paint cannot know it yet.
  const isHydrated = useIsHydrated();

  const cartItems = React.useMemo(
    () =>
      Object.entries(
        cart.reduce(
          (acc, product) => {
            (acc[product.brand] ??= []).push(product);
            return acc;
          },
          {} as Record<string, typeof cart>,
        ),
      ),
    [cart],
  );

  const handleBuyNow = React.useCallback(() => {
    if (getSelectedCount() === 0) {
      toast.error("Select at least one item to continue.");
      return;
    }
    setIsModalOpen(true);
  }, [getSelectedCount]);

  // Confirmed because it is plural and irreversible. Removing a single line is not —
  // it matches the drawer, where a mis-tap costs one re-add rather than the whole bag.
  const handleRemoveSelected = React.useCallback(() => {
    if (!window.confirm("Remove the selected items from your bag?")) return;
    removeSelectedItems();
    toast.success("Selected items removed");
  }, [removeSelectedItems]);

  const handleRemoveItem = React.useCallback(
    (id: string, size: string) => {
      removeFromCart(id, size);
      toast.success("Item removed");
    },
    [removeFromCart],
  );

  const header = (
    <>
      <Breadcrumb tone="dark" items={[{ name: "Home", href: "/" }, { name: "Your Bag" }]} />
      <SectionHeading title="Your Bag" description="Review your pieces, then continue to checkout." />
    </>
  );

  if (!isHydrated) {
    return (
      <Container className="py-12 space-y-8">
        {header}
        <StoreSkeletonGrid count={3} />
      </Container>
    );
  }

  if (cart.length === 0) {
    return (
      <Container className="py-12 space-y-8">
        {header}
        <StoreEmptyState
          title="Your bag is empty"
          description="Nothing here yet — start with the new arrivals, or browse the whole catalogue."
          action={<StoreLinkButton href="/shop">Start Shopping</StoreLinkButton>}
        />
      </Container>
    );
  }

  const isAllSelected = cart.length > 0 && selectedItems.size === cart.length;
  const selectedCount = getSelectedCount();
  const selectedTotal = getSelectedTotal();

  const toggleAll = () => (isAllSelected ? deselectAllItems() : selectAllItems());

  return (
    <Container className="py-12 space-y-8">
      <OrderSummary isVisible={isModalOpen} onClose={() => setIsModalOpen(false)} price={selectedTotal} totalItem={selectedCount} />

      {header}

      <div>
        <CartHeader cart={cart} isAllSelected={isAllSelected} onSelectAll={toggleAll} />

        {cartItems.map(([brand, products]) => (
          <CartCategory
            key={brand}
            brand={brand}
            products={products}
            isSelected={isBrandSelected(brand)}
            isPartiallySelected={isBrandPartiallySelected(brand)}
            selectedItems={selectedItems}
            onToggleCategory={() => toggleBrandSelection(brand)}
            onToggleItem={toggleItemSelection}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={handleRemoveItem}
          />
        ))}

        <CartSummary
          cart={cart}
          selectedCount={selectedCount}
          selectedTotal={selectedTotal}
          isAllSelected={isAllSelected}
          onSelectAll={toggleAll}
          onRemoveSelected={handleRemoveSelected}
          onBuyNow={handleBuyNow}
        />
      </div>
    </Container>
  );
};
