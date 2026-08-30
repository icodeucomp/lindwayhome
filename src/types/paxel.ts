/**
 * Paxel eCommerce API — wire types.
 *
 * These mirror the published contract field-for-field and deliberately keep Paxel's
 * own snake_case naming, so a reader can diff this file against the documentation
 * without translating anything. Nothing in the rest of the app should speak these
 * shapes directly — `@/services/paxel` is the only module that builds or reads them,
 * and `@/services/shipment` maps them onto our own camelCase domain types.
 *
 * Source: https://documenter.getpostman.com/view/10203487/SzKVRe39
 * Host:   https://stage-commerce-api.paxel.co/v1
 */

// ─────────────────────────────────────────────────────────────────────────────
// Service types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The four service types we integrate. Paxel also publishes PAXEL AMPLOP (documents)
 * and PAXELBIG (oversized); neither fits a clothing order, so both are out of scope.
 *
 * INSTANT is priced by a different endpoint (`/rates/instant`) and its rate call
 * sends `service_type: "INSTANT GOSEND"`, while the shipment call sends `"INSTANT"`.
 * That asymmetry is Paxel's, not ours — see `PAXEL_RATE_SERVICE_TYPE`.
 */
export const PAXEL_SERVICE_TYPES = ["SAMEDAY", "NEXTDAY", "REGULAR", "INSTANT"] as const;

export type PaxelServiceType = (typeof PAXEL_SERVICE_TYPES)[number];

/** What `service_type` must say on a *rate* request, which differs from the shipment request for INSTANT only. */
export const PAXEL_RATE_SERVICE_TYPE: Record<PaxelServiceType, string> = {
  SAMEDAY: "SAMEDAY",
  NEXTDAY: "NEXTDAY",
  REGULAR: "REGULAR",
  INSTANT: "INSTANT GOSEND",
};

/**
 * Per-service parcel ceilings, in the units Paxel validates on: weight in grams,
 * each side in centimetres. Exceeding either is a 400 from Paxel, so we check first
 * and give the buyer a sentence they can act on instead of a courier error.
 */
export const PAXEL_PARCEL_LIMITS: Record<PaxelServiceType, { maxWeightG: number; maxSideCm: number }> = {
  SAMEDAY: { maxWeightG: 5000, maxSideCm: 50 },
  NEXTDAY: { maxWeightG: 5000, maxSideCm: 50 },
  REGULAR: { maxWeightG: 5000, maxSideCm: 50 },
  INSTANT: { maxWeightG: 25000, maxSideCm: 50 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared envelope
// ─────────────────────────────────────────────────────────────────────────────

/** Every Paxel response is wrapped in this. Note `status_code` is in the body as well as the HTTP status. */
export interface PaxelEnvelope<T> {
  message: string;
  status_code: number;
  data: T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Addresses and items
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paxel's administrative levels use different words to ours. The mapping is exact,
 * and `@/services/shipment` is where it is applied:
 *
 *   Paxel province ← Location.province      (Provinsi)
 *   Paxel city     ← Location.district      (Kabupaten / Kota)
 *   Paxel district ← Location.sub_district  (Kecamatan)
 *   Paxel village  ← Location.village       (Kelurahan / Desa)
 */
export interface PaxelAddress {
  name: string;
  email?: string;
  phone: string;
  address: string;
  note: string;
  longitude?: number;
  latitude?: number;
  province: string;
  city: string;
  district: string;
  village: string;
  zip_code: string;
}

/** The subset of `PaxelAddress` a rate request needs — no name/phone/note. */
export interface PaxelRateAddress {
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  zip_code?: string;
  longitude?: number;
  latitude?: number;
}

export interface PaxelItem {
  code: string;
  name: string;
  category: string;
  is_fragile: boolean;
  price: number;
  quantity: number;
  /** grams, 1..5000 (25000 for INSTANT) */
  weight: number;
  /** centimetres, 1..50 */
  length: number;
  width: number;
  height: number;
  hvs_criteria?: { name_id: string; name_en: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Rates — POST /v1/rates/city  ·  POST /v1/rates/instant
// ─────────────────────────────────────────────────────────────────────────────

export interface PaxelRateRequest {
  origin: PaxelRateAddress;
  destination: PaxelRateAddress;
  /** grams — the whole shipment as ONE consolidated parcel, not per item */
  weight: number;
  /** "LxWxH" in cm, e.g. "30x35x20", max 11 characters */
  dimension: string;
  service_type: string;
}

export interface PaxelAvailableDay {
  day_details?: { name: string; nearest_date: string }[];
  unavailable_day_details?: { name: string; nearest_date: string }[];
  unavailable_days?: string[];
}

export interface PaxelTimeDetail {
  time_pickup_start: string;
  time_pickup_end: string;
  time_delivery_start: string;
  time_delivery_end: string;
  service: string;
  available_day?: PaxelAvailableDay;
}

export interface PaxelRateData {
  response_code?: number;
  service_name?: string;
  city_origin: string;
  city_destination: string;
  small_price: number;
  medium_price: number;
  large_price: number;
  custom_price: number;
  time_detail: PaxelTimeDetail[];
  /**
   * The price for the weight and dimension actually submitted, and therefore the
   * only figure we charge. small/medium/large are the tier table, not this quote.
   */
  fixed_price?: number;
  fixed_price_type?: string;
  fixed_short_size?: string;
  fixed_size?: string;
  /** Set only by the local mock transport, never by Paxel. Surfaced as a badge in the admin UI. */
  is_mock?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create shipment — POST /v1/shipments
// ─────────────────────────────────────────────────────────────────────────────

export interface PaxelCreateShipmentRequest {
  /** max 32 chars, unique per shipment — we send the order id */
  invoice_number: string;
  /** "CRD" is the only documented value */
  payment_type: "CRD";
  invoice_value: number;
  origin: PaxelAddress;
  destination: PaxelAddress;
  items: PaxelItem[];
  is_highvalue?: boolean;
  /** "YYYY-MM-DD HH:mm:ss" — must land inside a pickup window the rate call offered */
  pickup_datetime: string;
  need_insurance: boolean;
  note?: string;
  is_dropship?: boolean;
  dropshipper?: { name: string; phone: string };
  service_type: PaxelServiceType;
  is_custom_delivery_time?: boolean;
  is_do_return?: boolean;
  return_address?: PaxelAddress;
  return_items?: PaxelItem[];
}

export interface PaxelCreateShipmentData {
  airwaybill_code: string;
  shipping_cost: number;
  created_datetime: string;
  estimated_pickup_date: string;
  estimated_pickup_min_time: string;
  estimated_pickup_max_time: string;
  estimated_arrival_date: string;
  estimated_arrival_min_time: string;
  estimated_arrival_max_time: string;
  is_mock?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel shipment — POST /v1/shipments/:airwaybill_code/cancel
// ─────────────────────────────────────────────────────────────────────────────

export interface PaxelCancelShipmentRequest {
  /** max 150 chars */
  cancellation_reason: string;
}

export interface PaxelCancelShipmentData {
  airwaybill_code: string;
  cancellation_reason: string;
  is_mock?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Track — GET /v1/shipments/:airwaybill_code
// List by pickup date — GET /v1/shipments/:date/list
// ─────────────────────────────────────────────────────────────────────────────

export interface PaxelTrackingLog {
  created_datetime: string;
  name?: string;
  address?: string;
  note?: string;
  longitude?: number;
  latitude?: number;
  province?: string;
  city?: string;
  district?: string;
  status: string;
  counter?: number;
  receiver_name?: string;
  receiver_relation?: string;
}

/** One shipment as Paxel reports it. Both the track and list endpoints return this shape. */
export interface PaxelShipmentData {
  airwaybill_code: string;
  invoice_number: string;
  payment_type: string;
  invoice_value: number;
  origin: PaxelAddress;
  destination: PaxelAddress;
  items: PaxelItem[];
  pickup_datetime: string;
  need_insurance: boolean;
  note?: string;
  shipping_cost: number;
  created_datetime: string;
  estimated_pickup_date: string;
  estimated_pickup_min_time: string;
  estimated_pickup_max_time: string;
  estimated_arrival_date: string;
  estimated_arrival_min_time: string;
  estimated_arrival_max_time: string;
  photo?: string;
  signature?: string;
  /** Either a status code (e.g. "PDO") or its label (e.g. "Delivered") — Paxel returns both forms */
  latest_status: string;
  delivery_datetime?: string;
  logs: PaxelTrackingLog[];
  cancellation_reason?: string;
  is_mock?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shipment status mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paxel's status codes, per the webhook documentation. We store the raw code and
 * resolve the label for display, so an unrecognised future code still renders.
 */
export const PAXEL_STATUS_LABELS: Record<string, string> = {
  RPC: "Request received",
  CCS: "Cancelled by customer",
  RTP: "Courier on the way to pickup",
  COL: "Courier arrived at pickup",
  PRJL: "Pickup cancelled by courier",
  RAP: "Re-attempting pickup",
  PAPV: "Picked up",
  POL: "In transit",
  ODL: "Arrived at destination locker",
  POD: "Out for delivery",
  COD: "Courier arrived at destination",
  PDO: "Delivered",
  UNDLM: "Undeliverable",
  HAPH: "On hold",
  RTN: "Returned",
  CONFIRMED: "Confirmed",
  FAILED3PL: "Courier allocation failed",
  ONHOLD3PL: "On hold at courier",
  POLXL: "In transit",
  ODLXL: "Arrived at destination locker",
};

/** Codes after which a shipment can no longer be cancelled — Paxel replies 410 Gone. */
export const PAXEL_UNCANCELLABLE_STATUSES = ["PAPV", "POL", "ODL", "POD", "COD", "PDO", "RTN", "CCS", "POLXL", "ODLXL"];

/** Codes that mean the parcel reached the buyer. */
export const PAXEL_DELIVERED_STATUSES = ["PDO"];

export const paxelStatusLabel = (code: string | null | undefined): string => {
  if (!code) return "Unknown";
  return PAXEL_STATUS_LABELS[code.toUpperCase()] ?? code;
};
