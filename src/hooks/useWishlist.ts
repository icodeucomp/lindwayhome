"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lindway_wishlist";
const EXPIRES_IN_DAYS = 30;

interface StorageData<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

/**
 * Wishlist is per-visitor and lives only in localStorage (D11, F-35). It deliberately
 * mirrors the hand-rolled subscribe store in useCart rather than using Zustand, so both
 * client-side carts behave identically. It is NOT the same thing as Product.isFavorite,
 * which is an admin flag shared by every visitor.
 */
const setLocalStorage = (value: string[]): void => {
  try {
    const payload: StorageData<string[]> = { data: value, timestamp: Date.now(), expiresIn: EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error: unknown) {
    console.error("Error saving wishlist:", error instanceof Error ? error.message : "Unknown error");
  }
};

const getLocalStorage = (): string[] | null => {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;

    const payload: StorageData<string[]> = JSON.parse(item);
    if (Date.now() - payload.timestamp > payload.expiresIn) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return payload.data;
  } catch (error: unknown) {
    console.error("Error reading wishlist:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
};

const createWishlistStore = () => {
  let productIds = new Set<string>();
  const listeners = new Set<() => void>();

  const commit = (next: Set<string>) => {
    productIds = next;
    if (productIds.size > 0) setLocalStorage(Array.from(productIds));
    else localStorage.removeItem(STORAGE_KEY);
    listeners.forEach((listener) => listener());
  };

  const store = {
    get items() {
      return Array.from(productIds);
    },
    has: (productId: string) => productIds.has(productId),
    count: () => productIds.size,
    toggle: (productId: string) => {
      const next = new Set(productIds);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      commit(next);
    },
    remove: (productId: string) => {
      const next = new Set(productIds);
      next.delete(productId);
      commit(next);
    },
    clear: () => commit(new Set()),
    load: () => {
      const saved = getLocalStorage();
      if (saved && Array.isArray(saved)) {
        productIds = new Set(saved);
        listeners.forEach((listener) => listener());
      }
    },
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { store, subscribe };
};

const { store: wishlistStore, subscribe } = createWishlistStore();

export const useWishlistStore = () => {
  const [, forceUpdate] = useState<Record<string, never>>({});

  useEffect(() => {
    wishlistStore.load();
    return subscribe(() => forceUpdate({}));
  }, []);

  return wishlistStore;
};
