import { PAXEL_PARCEL_LIMITS, PaxelServiceType } from "@/types/paxel";

/**
 * Cart → one parcel.
 *
 * v1 priced shipping per line: each item contributed its own volumetric weight and
 * the costs were summed. Paxel does not work that way — a rate request carries a
 * single `weight` and a single `dimension` string, because a shipment is one box a
 * courier picks up. So the cart has to be packed before it can be priced.
 *
 * ## The packing model
 *
 * Items are stacked flat, tallest footprint first:
 *
 *   length = max(length of any item)
 *   width  = max(width of any item)
 *   height = Σ (height × quantity)
 *
 * If the stack grows past the 50 cm ceiling it is split into side-by-side columns,
 * trading height for width and then for length. If it still will not fit, the order
 * genuinely cannot ship as one Paxel parcel and the caller says so.
 *
 * This is a heuristic and it is meant to be a slightly pessimistic one. Folded
 * clothing compresses, so a real box is usually smaller than this predicts, which
 * means we over-declare rather than under-declare. Under-declaring is the expensive
 * mistake: Paxel reweighs at pickup and bills the difference to the merchant, after
 * the buyer has already been charged a price we can no longer change.
 */

export interface ParcelItem {
  weight_g: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  quantity: number;
}

export interface ConsolidatedParcel {
  /** total grams, what Paxel's `weight` field wants */
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** "LxWxH", what Paxel's `dimension` field wants — max 11 characters */
  dimension: string;
}

export interface ParcelFitResult {
  fits: boolean;
  /** Populated only when `fits` is false — a sentence a buyer can act on. */
  reason?: string;
}

const MAX_DIMENSION_STRING_LENGTH = 11;

const ceil = (value: number): number => Math.max(1, Math.ceil(value));

/**
 * Packs the lines into a single box.
 *
 * Returns the box even when it exceeds a service ceiling — deciding whether it fits
 * is `parcelFitsService`'s job, because the answer differs per service (INSTANT
 * carries 25 kg, the rest carry 5 kg).
 */
export const consolidateParcel = (items: ParcelItem[]): ConsolidatedParcel => {
  if (items.length === 0) throw new Error("Cannot build a parcel from an empty cart");

  let weightG = 0;
  let footprintLength = 0;
  let footprintWidth = 0;
  let stackHeight = 0;

  for (const item of items) {
    const quantity = Math.max(1, item.quantity);

    weightG += item.weight_g * quantity;
    footprintLength = Math.max(footprintLength, item.length_cm);
    footprintWidth = Math.max(footprintWidth, item.width_cm);
    stackHeight += item.height_cm * quantity;
  }

  // Every service shares the same 50 cm side limit, so the reflow ceiling is a
  // constant rather than something that has to be threaded in per service.
  const maxSide = PAXEL_PARCEL_LIMITS.REGULAR.maxSideCm;

  let lengthCm = ceil(footprintLength);
  let widthCm = ceil(footprintWidth);
  let heightCm = ceil(stackHeight);

  if (heightCm > maxSide) {
    // Too tall to stack: lay the surplus out in columns beside the first one.
    const columns = Math.ceil(heightCm / maxSide);
    heightCm = maxSide;
    widthCm = ceil(widthCm * columns);

    if (widthCm > maxSide) {
      // Still too wide: spread the columns along the length instead.
      const rows = Math.ceil(widthCm / maxSide);
      widthCm = maxSide;
      lengthCm = ceil(lengthCm * rows);
    }
  }

  return { weightG: ceil(weightG), lengthCm, widthCm, heightCm, dimension: `${lengthCm}x${widthCm}x${heightCm}` };
};

/**
 * Whether a packed parcel is within a given service's ceilings.
 *
 * Checked before the rate call rather than after, so an oversized cart produces a
 * sentence naming the actual problem instead of Paxel's documented empty-bodied 400.
 */
export const parcelFitsService = (parcel: ConsolidatedParcel, serviceType: PaxelServiceType): ParcelFitResult => {
  const { maxWeightG, maxSideCm } = PAXEL_PARCEL_LIMITS[serviceType];

  if (parcel.weightG > maxWeightG) {
    return { fits: false, reason: `This order weighs ${(parcel.weightG / 1000).toFixed(1)} kg, over the ${maxWeightG / 1000} kg limit for this service.` };
  }

  const longest = Math.max(parcel.lengthCm, parcel.widthCm, parcel.heightCm);
  if (longest > maxSideCm) {
    return { fits: false, reason: `This order packs to ${parcel.dimension} cm, over the ${maxSideCm} cm limit for this service.` };
  }

  // Paxel caps the dimension string itself at 11 characters. Three sides at or under
  // 50 cm can never exceed that, so this only fires if the limits above ever change.
  if (parcel.dimension.length > MAX_DIMENSION_STRING_LENGTH) {
    return { fits: false, reason: `This order packs to ${parcel.dimension} cm, which the courier cannot accept.` };
  }

  return { fits: true };
};
