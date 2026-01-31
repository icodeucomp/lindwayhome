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

export interface ShippingCalculationResult {
  total_weight_kg: number;
  rounded_weight_kg: number;
  distance_km: number;
  zone: string;
  weight_cost: number;
  distance_cost: number;
  shipping_raw: number;
  shipping_final: number;
  multiplier: number;
}

export interface DestinationCoordinates {
  lat: number;
  long: number;
}

// Helper function to convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Haversine formula to calculate distance between two coordinates
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number, earthRadius: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(a));
  return earthRadius * c;
}

// Determine zone and multiplier based on distance
export function getZoneAndMultiplier(distance_km: number): { zone: string; multiplier: number } {
  if (distance_km <= 10) return { zone: "Z1", multiplier: 1.0 };
  if (distance_km <= 30) return { zone: "Z2", multiplier: 1.2 };
  if (distance_km <= 100) return { zone: "Z3", multiplier: 1.5 };
  return { zone: "Z4", multiplier: 2.0 };
}

// Calculate shipping cost
export function calculateShippingCost(items: ShippingItem[], distance_km: number, config: ShippingConfig): ShippingCalculationResult {
  let total_weight_kg = 0;

  // Calculate total chargeable weight
  for (const item of items) {
    const actual_weight_kg = item.weight_g / 1000;
    const volumetric_weight_kg = (item.length_cm * item.width_cm * item.height_cm) / config.volume_divider;
    const chargeable_weight_kg = Math.max(actual_weight_kg, volumetric_weight_kg);
    total_weight_kg += chargeable_weight_kg * item.quantity;
  }

  const rounded_weight_kg = Math.ceil(total_weight_kg);

  // Get zone and multiplier
  const { zone, multiplier } = getZoneAndMultiplier(distance_km);

  // Calculate costs
  const weight_cost = rounded_weight_kg * config.price_per_kg;
  const distance_cost = distance_km * config.price_per_km;
  const shipping_raw = (config.base_price + weight_cost + distance_cost) * multiplier;
  const shipping_final = Math.max(shipping_raw, config.min_shipping);

  return {
    total_weight_kg,
    rounded_weight_kg,
    distance_km,
    zone,
    weight_cost,
    distance_cost,
    shipping_raw,
    shipping_final,
    multiplier,
  };
}
