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
   * Resolve the parcel dimensions for one product in one size (§B6.2, D6):
   *
   *   ProductVariant.packageDimensions          per product × size
   *     → config package_dimensions[size.code]  store-wide default
   *       → null, and the caller returns 404
   *
   * Body measurements are a different thing entirely and live on `SizeGuideRow` —
   * they describe the pattern, this describes the box it ships in.
   */
  static async getPackageDimensions(productId: string, sizeCode: string): Promise<ShippingItem | null> {
    const code = sizeCode.toUpperCase();

    const variant = await prisma.productVariant.findFirst({
      where: { productId, size: { code } },
      select: { packageDimensions: true },
    });

    const fromVariant = variant?.packageDimensions as Record<string, number> | null | undefined;
    if (fromVariant && fromVariant.weight_g != null) return ShippingService.toShippingItem(fromVariant);

    const fallback = await prisma.configParameter.findFirst({
      where: { key: code, group: { name: "package_dimensions" }, isActive: true },
      select: { value: true },
    });

    if (fallback?.value) return ShippingService.toShippingItem(fallback.value as Record<string, number>);

    return null;
  }

  private static toShippingItem(source: Record<string, number>): ShippingItem {
    return {
      weight_g: Number(source.weight_g) || 0,
      length_cm: Number(source.length_cm) || 0,
      width_cm: Number(source.width_cm) || 0,
      height_cm: Number(source.height_cm) || 0,
      quantity: 1,
    };
  }
}
