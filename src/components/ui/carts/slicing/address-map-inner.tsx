"use client";

import * as React from "react";

import { PiMapPinLine } from "react-icons/pi";

import "leaflet/dist/leaflet.css";

import type { DivIcon, LeafletMouseEvent, Marker as LeafletMarker } from "leaflet";

import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { AddressMapProps } from "./address-map";

/**
 * The map itself. Never imported statically — `./address-map` loads it through
 * `next/dynamic` with `ssr: false`, because everything in this file reaches for
 * `window` the moment it is evaluated. See the note there.
 */

/**
 * A marker drawn as inline HTML rather than Leaflet's default PNG.
 *
 * Leaflet's default icon resolves its image by a URL relative to its own CSS, which
 * breaks under a bundler — it is the single most common reason a Leaflet map renders
 * with no visible pin. A `divIcon` has no asset to lose and inherits our palette.
 */
const usePinIcon = (): DivIcon | null => {
  const [icon, setIcon] = React.useState<DivIcon | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    // Lazily imported for the same reason the whole module is: `leaflet` reads `window`.
    import("leaflet").then((L) => {
      if (cancelled) return;
      setIcon(
        L.divIcon({
          className: "",
          html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#BA8164;border:3px solid #FAF6F5;box-shadow:0 2px 8px rgba(57,50,44,.45)"></span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return icon;
};

/** Moves the viewport when the chosen village changes, without remounting the map. */
const Recenter = ({ latitude, longitude, centerKey }: { latitude: number; longitude: number; centerKey: string }) => {
  const map = useMap();
  const lastKey = React.useRef(centerKey);

  React.useEffect(() => {
    if (lastKey.current === centerKey) return;
    lastKey.current = centerKey;
    map.setView([latitude, longitude], 15, { animate: true });
  }, [centerKey, latitude, longitude, map]);

  return null;
};

/** Tapping the map is the same gesture as dragging the pin, and far easier on a phone. */
const ClickToPlace = ({ onChange }: { onChange: AddressMapProps["onChange"] }) => {
  useMapEvents({
    click: (event: LeafletMouseEvent) => onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
  });

  return null;
};

export const AddressMapInner = ({ latitude, longitude, isPinned, centerKey, onChange }: AddressMapProps) => {
  const icon = usePinIcon();
  const markerRef = React.useRef<LeafletMarker | null>(null);

  const handleDragEnd = React.useCallback(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const { lat, lng } = marker.getLatLng();
    onChange({ latitude: lat, longitude: lng });
  }, [onChange]);

  return (
    <div className="space-y-1">
      <label className="mb-1.5 block font-heading text-xxs uppercase tracking-[0.16em] text-body/55">
        Pin Your Exact Location
        <span className="text-primary"> *</span>
      </label>

      <div className="overflow-hidden border border-border">
        <MapContainer center={[latitude, longitude]} zoom={isPinned ? 16 : 14} scrollWheelZoom={false} style={{ height: 260, width: "100%" }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter latitude={latitude} longitude={longitude} centerKey={centerKey} />
          <ClickToPlace onChange={onChange} />
          {icon && <Marker position={[latitude, longitude]} icon={icon} draggable eventHandlers={{ dragend: handleDragEnd }} ref={markerRef} />}
        </MapContainer>
      </div>

      <p className="flex items-start gap-1.5 pt-1 text-xxs text-body/55">
        <PiMapPinLine className="mt-px size-3.5 shrink-0 text-primary" />
        {isPinned ? (
          <span>
            Pinned at {latitude.toFixed(5)}, {longitude.toFixed(5)}. Drag the pin if it is not quite right.
          </span>
        ) : (
          <span>Drag the pin — or tap the map — onto your building so the courier can find you. Right now it sits at the centre of your village.</span>
        )}
      </p>
    </div>
  );
};

export default AddressMapInner;
