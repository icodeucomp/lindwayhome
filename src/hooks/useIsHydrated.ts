"use client";

import { useSyncExternalStore } from "react";

/** Nothing ever changes, so the store never notifies — the value flips on hydration alone. */
const neverChanges = () => () => {};

/**
 * False while the server renders and through the first client render, true afterwards.
 *
 * Anything read from `localStorage` — the cart and the wishlist (F-6) — is unknown on
 * the server, so rendering the real number straight away is a hydration mismatch. The
 * obvious fix is `useState(false)` plus an effect that sets it true, but that is
 * exactly the pattern `react-hooks/set-state-in-effect` exists to catch: it is a
 * second render triggered from an effect.
 *
 * `useSyncExternalStore` is the API built for this. It takes separate server and
 * client snapshots, so React resolves the difference during hydration instead of us
 * chasing it with an effect afterwards.
 */
export const useIsHydrated = (): boolean => useSyncExternalStore(neverChanges, () => true, () => false);
