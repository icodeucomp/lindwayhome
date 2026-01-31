import { prisma } from "@/lib/prisma";
import { ShippingConfig, DestinationCoordinates, ShippingItem } from "@/utils";

type ConfigValue = string | number | boolean | object | null;

type ConfigMap = Record<string, ConfigValue>;

export class ShippingService {
  /**
   * Get shipping configuration from database
   */
  static async getShippingConfig(): Promise<ShippingConfig | null> {
    const shippingConfigs = await prisma.configParameter.findMany({
      where: {
        group: { name: "shipping" },
        isActive: true,
      },
      select: { key: true, value: true },
    });

    if (!shippingConfigs || shippingConfigs.length === 0) {
      return null;
    }

    const configMap = shippingConfigs.reduce<ConfigMap>((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    return {
      volume_divider: Number(configMap.volume_divider) || 6000,
      price_per_kg: Number(configMap.price_per_kg) || 5000,
      price_per_km: Number(configMap.price_per_km) || 1000,
      base_price: Number(configMap.base_price) || 10000,
      min_shipping: Number(configMap.min_shipping) || 15000,
      origin_lat: Number(configMap.origin_lat) || -6.2088,
      origin_long: Number(configMap.origin_long) || 106.8456,
      earth_radius_km: Number(configMap.earth_radius_km) || 6371,
    };
  }

  /**
   * Get destination coordinates from location data
   */
  static async getDestinationCoordinates(province: string, district: string, sub_district: string, village: string): Promise<DestinationCoordinates | null> {
    const location = await prisma.location.findFirst({
      where: {
        province,
        district,
        sub_district,
        village,
      },
      select: {
        approx_lat: true,
        approx_long: true,
      },
    });

    if (!location) return null;

    return {
      lat: Number(location.approx_lat),
      long: Number(location.approx_long),
    };
  }

  /**
   * Get product dimensions for shipping calculation from config_parameter
   */
  static async getProductDimensionsBySize(size: string): Promise<ShippingItem | null> {
    const dimensionConfigs = await prisma.configParameter.findMany({
      where: {
        group: { name: "product_dimensions" },
        isActive: true,
      },
      select: { key: true, value: true },
    });

    if (!dimensionConfigs || dimensionConfigs.length === 0) {
      return null;
    }

    const configMap = dimensionConfigs.reduce<ConfigMap>((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    if (configMap[size]) {
      const dimensions = typeof configMap[size] === "string" ? JSON.parse(configMap[size]) : configMap[size];

      return {
        weight_g: Number(dimensions.weight_g) || 0,
        length_cm: Number(dimensions.length_cm) || 0,
        width_cm: Number(dimensions.width_cm) || 0,
        height_cm: Number(dimensions.height_cm) || 0,
        quantity: 1,
      };
    }

    if (configMap.dimensions) {
      const allDimensions = typeof configMap.dimensions === "string" ? JSON.parse(configMap.dimensions) : configMap.dimensions;

      const sizeDimensions = allDimensions[size.toUpperCase()];
      if (sizeDimensions) {
        return {
          weight_g: Number(sizeDimensions.weight_g) || 0,
          length_cm: Number(sizeDimensions.length_cm) || 0,
          width_cm: Number(sizeDimensions.width_cm) || 0,
          height_cm: Number(sizeDimensions.height_cm) || 0,
          quantity: 1,
        };
      }
    }

    return null;
  }
}
