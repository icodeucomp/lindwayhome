"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * True once the page has been scrolled past `threshold` pixels.
 *
 * `useSyncExternalStore` rather than a `useState` + scroll effect for two reasons: it
 * avoids the setState-in-effect pattern the lint rule catches, and its server snapshot
 * means a page restored mid-scroll reports the right answer on the first client render
 * instead of flashing the tall header and then collapsing it.
 */
export const useScrolled = (threshold = 24): boolean => {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("scroll", onChange, { passive: true });
    return () => window.removeEventListener("scroll", onChange);
  }, []);

  const getSnapshot = useCallback(() => window.scrollY > threshold, [threshold]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};
