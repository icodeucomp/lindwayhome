import { create } from "zustand";

/**
 * Open/closed state for the slide-over bag (reference/Cart Details - *.png).
 *
 * Zustand rather than the hand-rolled subscribe store used by `useCart`/`useWishlist`:
 * this is ephemeral UI state with nothing to persist, so it has none of the
 * localStorage machinery those two exist for.
 *
 * The drawer only previews the bag. Checkout still runs through the `/cart` wizard,
 * which owns the shipping calculation and the signed checkout token (D8).
 */
interface CartDrawerStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCartDrawer = create<CartDrawerStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
