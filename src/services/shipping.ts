import { prisma } from "@/lib/prisma";
import { ShippingConfig, ShippingZone, ZoneResult, DestinationCoordinates, ShippingItem, DEFAULT_SHIPPING_ZONES, resolveZone } from "@/utils";

type ConfigValue = string | number | boolean | object | null;
type ConfigMap = Record<string, ConfigValue>;

export class ShippingService {
  /**
   * Get core shipping config (rates, origin, etc.) from DB
   */
  static async getShippingConfig(): Promise<ShippingConfig | null> {
    const rows = await prisma.configParameter.findMany({
      where: { group: { name: "shipping" }, isActive: true },
      select: { key: true, value: true },
    });

    if (!rows.length) return null;

    const map = rows.reduce<ConfigMap>((acc, r) => {
      acc[r.key] = r.value;
      return acc;
    }, {});

    return {
      volume_divider: Number(map.volume_divider) || 6000,
      price_per_kg: Number(map.price_per_kg) || 5000,
      price_per_km: Number(map.price_per_km) || 1000,
      base_price: Number(map.base_price) || 10000,
      min_shipping: Number(map.min_shipping) || 15000,
      origin_lat: Number(map.origin_lat) || -6.2088,
      origin_long: Number(map.origin_long) || 106.8456,
      earth_radius_km: Number(map.earth_radius_km) || 6371,
    };
  }

  /**
   * Get shipping zones array from DB (falls back to hardcoded defaults)
   */
  static async getShippingZones(): Promise<ShippingZone[]> {
    const row = await prisma.configParameter.findUnique({
      where: { key: "shipping_zones" },
      select: { value: true, isActive: true },
    });

    if (!row || !row.isActive || !row.value) return DEFAULT_SHIPPING_ZONES;

    return row.value as unknown as ShippingZone[];
  }

  /**
   * Resolve zone + multiplier/price_override for a given distance
   */
  static async getZoneForDistance(distance_km: number): Promise<ZoneResult> {
    const zones = await ShippingService.getShippingZones();
    return resolveZone(distance_km, zones);
  }

  /**
   * Get destination coordinates from location table
   */
  static async getDestinationCoordinates(province: string, district: string, sub_district: string, village: string): Promise<DestinationCoordinates | null> {
    const location = await prisma.location.findFirst({
      where: { province, district, sub_district, village },
      select: { approx_lat: true, approx_long: true },
    });

    if (!location) return null;

    return {
      lat: Number(location.approx_lat),
      long: Number(location.approx_long),
    };
  }

  /**
   * Get product dimensions by size from config_parameter (group: product_dimensions)
   */
  static async getProductDimensionsBySize(size: string): Promise<ShippingItem | null> {
    // Try direct key lookup first (e.g. key = "M")
    const direct = await prisma.configParameter.findFirst({
      where: {
        key: size.toUpperCase(),
        group: { name: "product_dimensions" },
        isActive: true,
      },
      select: { value: true },
    });

    if (direct?.value) {
      const d = direct.value as Record<string, number>;
      return {
        weight_g: Number(d.weight_g) || 0,
        length_cm: Number(d.length_cm) || 0,
        width_cm: Number(d.width_cm) || 0,
        height_cm: Number(d.height_cm) || 0,
        quantity: 1,
      };
    }

    return null;
  }
}
