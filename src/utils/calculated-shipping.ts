export interface ShippingItem {
  weight_g: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  quantity: number;
}

export interface ShippingConfig {
  volume_divider: number;
  price_per_kg: number;
  price_per_km: number;
  base_price: number;
  min_shipping: number;
  origin_lat: number;
  origin_long: number;
  earth_radius_km: number;
}

export interface ShippingZone {
  zone: string;
  label: string;
  max_km: number | null;
  multiplier: number | null;
  price_override: number | null;
}

export interface ZoneResult {
  zone: string;
  label: string;
  multiplier: number | null;
  price_override: number | null;
}

export interface ShippingCalculationResult {
  total_weight_kg: number;
  rounded_weight_kg: number;
  distance_km: number;
  zone: string;
  zone_label: string;
  weight_cost: number;
  distance_cost: number;
  shipping_raw: number;
  shipping_final: number;
  multiplier: number | null;
  price_override: number | null;
}

export interface DestinationCoordinates {
  lat: number;
  long: number;
}

export const DEFAULT_SHIPPING_ZONES: ShippingZone[] = [
  { zone: "Z1", label: "Local", max_km: 10, multiplier: 1.0, price_override: null },
  { zone: "Z2", label: "Nearby", max_km: 30, multiplier: 1.2, price_override: null },
  { zone: "Z3", label: "Regional", max_km: 100, multiplier: 1.5, price_override: null },
  { zone: "Z4", label: "Long Distance", max_km: null, multiplier: 2.0, price_override: null },
];

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Haversine formula
export function calculateDistance(originLat: number, originLong: number, destinationLat: number, destinationLong: number, earthRadius: number): number {
  const dLat = toRadians(destinationLat - originLat);
  const dLon = toRadians(destinationLong - originLong);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(originLat)) * Math.cos(toRadians(destinationLat)) * Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.asin(Math.sqrt(a));
}

// Resolve zone from a sorted zones array
export function resolveZone(distance_km: number, zones: ShippingZone[]): ZoneResult {
  const sorted = [...zones].sort((a, b) => {
    if (a.max_km === null) return 1;
    if (b.max_km === null) return -1;
    return a.max_km - b.max_km;
  });

  for (const z of sorted) {
    if (z.max_km === null || distance_km <= z.max_km) {
      return {
        zone: z.zone,
        label: z.label,
        multiplier: z.multiplier,
        price_override: z.price_override,
      };
    }
  }

  const last = sorted[sorted.length - 1];
  return {
    zone: last.zone,
    label: last.label,
    multiplier: last.multiplier,
    price_override: last.price_override,
  };
}

export function calculateShippingCost(items: ShippingItem[], distance_km: number, config: ShippingConfig, zones: ShippingZone[] = DEFAULT_SHIPPING_ZONES): ShippingCalculationResult {
  // 1. Calculate total chargeable weight
  let total_weight_kg = 0;

  for (const item of items) {
    const actual_weight_kg = item.weight_g / 1000;
    const volumetric_weight_kg = (item.length_cm * item.width_cm * item.height_cm) / config.volume_divider;
    const chargeable_weight_kg = Math.max(actual_weight_kg, volumetric_weight_kg);
    total_weight_kg += chargeable_weight_kg * item.quantity;
  }

  const rounded_weight_kg = Math.ceil(total_weight_kg);

  // 2. Resolve zone
  const { zone, label: zone_label, multiplier, price_override } = resolveZone(distance_km, zones);

  // 3. Calculate final cost
  const weight_cost = rounded_weight_kg * config.price_per_kg;
  const distance_cost = distance_km * config.price_per_km;

  let shipping_raw: number;

  if (price_override !== null) {
    shipping_raw = price_override;
  } else {
    shipping_raw = (config.base_price + weight_cost + distance_cost) * (multiplier ?? 1.0);
  }

  const shipping_final = Math.max(shipping_raw, config.min_shipping);

  return {
    total_weight_kg,
    rounded_weight_kg,
    distance_km,
    zone,
    zone_label,
    weight_cost,
    distance_cost,
    shipping_raw,
    shipping_final,
    multiplier,
    price_override,
  };
}
