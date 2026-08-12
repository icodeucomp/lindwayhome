"use client";

import { useCallback, useSyncExternalStore } from "react";

import { PiArrowUp } from "react-icons/pi";

/**
 * Back-to-top button, shown once the reader is well past the fold.
 *
 * `useSyncExternalStore` rather than `useState` + a scroll effect: the effect version
 * is the pattern `react-hooks/set-state-in-effect` exists to catch, and its server
 * snapshot means a page restored mid-scroll gets the right answer on the first client
 * render instead of flashing the button in.
 *
 * Square rather than a circle, and `body` rather than a grey — the palette has no grey,
 * and nothing else in v2 is round.
 */

const subscribe = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};

export const ScrollToTop = () => {
  const getSnapshot = useCallback(() => window.scrollY > 300, []);
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
      className={`fixed bottom-6 right-6 z-50 grid size-11 place-items-center bg-body text-light shadow-sm transition-all duration-300 hover:bg-primary ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <PiArrowUp className="size-5" />
    </button>
  );
};
