"use client";

import dynamic from "next/dynamic";

/**
 * Where the courier actually goes.
 *
 * The village dropdowns above this map give us the administrative levels Paxel
 * prices on — those are exact, and they come from our own `Location` table rather
 * than a geocoder's guess at Indonesian kelurahan names. What they cannot give us
 * is a house: `Location.approx_lat/long` is a village centroid, so a courier
 * navigating to it arrives at the kelurahan office.
 *
 * So the map opens centred on that centroid and asks the buyer to move the pin onto
 * their door. No geocoding API, no key, no billing — OpenStreetMap tiles and a
 * draggable marker. `Order.isPinned` records whether they actually moved it, so an
 * admin can tell a real coordinate from a guess before dispatching a courier.
 *
 * ## Why this file is a wrapper and nothing else
 *
 * `leaflet` reads `window` at module scope. `ssr: false` only stops the component
 * from *rendering* on the server — it does not stop a static `import` at the top of
 * the same file from being evaluated there. With the imports in this file the
 * production build died prerendering `/id/cart` with "window is not defined", even
 * though nothing rendered the map.
 *
 * Keeping the imports behind `dynamic(() => import(...))` in a separate module is
 * what actually defers them. Do not move the react-leaflet imports back up here.
 */

export interface AddressMapProps {
  latitude: number;
  longitude: number;
  /** true once the buyer has moved the pin themselves */
  isPinned: boolean;
  /** Re-centres the map when the buyer picks a different village. */
  centerKey: string;
  onChange: (position: { latitude: number; longitude: number }) => void;
}

export const AddressMap = dynamic<AddressMapProps>(() => import("./address-map-inner").then((module) => module.AddressMapInner), {
  ssr: false,
  loading: () => <div className="h-65 w-full animate-pulse border border-border bg-muted" />,
});
