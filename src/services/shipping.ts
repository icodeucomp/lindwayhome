import { prisma } from "@/lib/prisma";

import { ParcelItem } from "@/utils/parcel";

/**
 * What survives of v1's shipping service.
 *
 * The distance/zone pipeline it used to own — haversine, `getShippingConfig`,
 * `getShippingZones`, `getZoneForDistance` — is gone. Shipping is priced by the
 * courier now (`./shipment`), so computing a second price here would put the number
 * shown to the buyer and the number Paxel bills us on two different code paths.
 *
 * Two lookups remain, both still needed:
 *
 *  - `getPackageDimensions` feeds the parcel Paxel is asked to price;
 *  - `getDestinationCoordinates` gives the checkout map a sensible starting pin.
 */

export interface DestinationCoordinates {
  lat: number;
  long: number;
}

export class ShippingService {
  /**
   * The village centroid, used as the initial position of the checkout map pin.
   *
   * This is an approximation and is treated as one: it points at the kelurahan, not
   * the buyer's door. `Order.isPinned` records whether the buyer moved it.
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
  static async getPackageDimensions(productId: string, sizeCode: string): Promise<ParcelItem | null> {
    const code = sizeCode.toUpperCase();

    const variant = await prisma.productVariant.findFirst({
      where: { productId, size: { code } },
      select: { packageDimensions: true },
    });

    const fromVariant = variant?.packageDimensions as Record<string, number> | null | undefined;
    if (fromVariant && fromVariant.weight_g != null) return ShippingService.toParcelItem(fromVariant);

    const fallback = await prisma.configParameter.findFirst({
      where: { key: code, group: { name: "package_dimensions" }, isActive: true },
      select: { value: true },
    });

    if (fallback?.value) return ShippingService.toParcelItem(fallback.value as Record<string, number>);

    return null;
  }

  private static toParcelItem(source: Record<string, number>): ParcelItem {
    return {
      weight_g: Number(source.weight_g) || 0,
      length_cm: Number(source.length_cm) || 0,
      width_cm: Number(source.width_cm) || 0,
      height_cm: Number(source.height_cm) || 0,
      quantity: 1,
    };
  }
}
