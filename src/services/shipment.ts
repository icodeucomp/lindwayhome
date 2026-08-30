import type { Prisma } from "prisma-client/client";

import { logCalculation, logger, prisma } from "@/lib";

import { ConsolidatedParcel, parcelFitsService, toRupiah } from "@/utils";

import {
  PAXEL_DELIVERED_STATUSES,
  PAXEL_RATE_SERVICE_TYPE,
  PAXEL_SERVICE_TYPES,
  PaxelAddress,
  PaxelCreateShipmentRequest,
  PaxelItem,
  PaxelRateAddress,
  PaxelRateData,
  PaxelServiceType,
  PaxelShipmentData,
  PaxelTimeDetail,
  paxelStatusLabel,
} from "@/types/paxel";

import { ConfigService } from "./config-parameters";
import { PaxelApi, isPaxelMock } from "./paxel";
import { PaxelError } from "./paxel-error";

/**
 * Everything the app knows about shipping, expressed in our vocabulary.
 *
 * `./paxel` speaks Paxel's wire format and nothing else. This module is the only
 * translator between the two, and it owns three things that would otherwise be
 * scattered:
 *
 *  1. the administrative-level mapping (our `district` is Paxel's `city`),
 *  2. the store's origin address, which lives in `ConfigParameter` rows,
 *  3. the rule that a quote is only offered if the parcel actually fits the service.
 *
 * Nothing here writes prices onto an order. The checkout token remains the only
 * path by which a price reaches `Order` (D8) — this module just produces the
 * number that gets signed.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Origin configuration
// ─────────────────────────────────────────────────────────────────────────────

const ORIGIN_KEYS = [
  "origin_name",
  "origin_phone",
  "origin_email",
  "origin_address",
  "origin_note",
  "origin_province",
  "origin_city",
  "origin_district",
  "origin_village",
  "origin_zip_code",
  "origin_lat",
  "origin_long",
  "enabled_services",
  "item_category",
  "need_insurance",
  "pickup_lead_minutes",
  "shipping_timezone",
];

export interface ShippingOrigin {
  address: PaxelAddress;
  latitude: number;
  longitude: number;
  enabledServices: PaxelServiceType[];
  itemCategory: string;
  needInsurance: boolean;
  pickupLeadMinutes: number;
  timeZone: string;
}

const asString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : value == null ? fallback : String(value));

/**
 * Reads the store's dispatch address and shipping preferences.
 *
 * Every value is required to be present. v1's `ShippingService` fell back to
 * hardcoded defaults when a config row was missing, which is how it shipped with
 * Jakarta coordinates while the brand operates from Denpasar and silently mispriced
 * every order (A9.11). A missing origin here is an error, loudly, because the
 * failure it prevents is a courier being sent to the wrong island.
 */
export const getShippingOrigin = async (): Promise<ShippingOrigin> => {
  const config = await ConfigService.getConfigValue(ORIGIN_KEYS);

  const missing = ["origin_name", "origin_phone", "origin_address", "origin_province", "origin_city", "origin_district", "origin_village", "origin_zip_code", "origin_lat", "origin_long"].filter(
    (key) => config[key] === undefined || config[key] === null || config[key] === "",
  );

  if (missing.length > 0) {
    throw new Error(`Shipping origin is not configured. Missing parameter${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Set these on the admin Parameters page.`);
  }

  const rawServices = Array.isArray(config.enabled_services) ? config.enabled_services : [];

  // An unrecognised entry is dropped rather than passed through — sending Paxel a
  // service type it does not publish returns their empty-bodied 400.
  const enabledServices = rawServices.map((value) => asString(value).toUpperCase()).filter((value): value is PaxelServiceType => PAXEL_SERVICE_TYPES.includes(value as PaxelServiceType));

  return {
    address: {
      name: asString(config.origin_name),
      email: asString(config.origin_email) || undefined,
      phone: asString(config.origin_phone),
      address: asString(config.origin_address),
      note: asString(config.origin_note),
      province: asString(config.origin_province),
      city: asString(config.origin_city),
      district: asString(config.origin_district),
      village: asString(config.origin_village),
      zip_code: asString(config.origin_zip_code),
      latitude: Number(config.origin_lat),
      longitude: Number(config.origin_long),
    },
    latitude: Number(config.origin_lat),
    longitude: Number(config.origin_long),
    enabledServices: enabledServices.length > 0 ? enabledServices : ["REGULAR"],
    itemCategory: asString(config.item_category, "Fashion"),
    needInsurance: config.need_insurance === true,
    pickupLeadMinutes: Number(config.pickup_lead_minutes) || 120,
    timeZone: asString(config.shipping_timezone, "Asia/Makassar"),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Destination
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A checkout destination in our column names.
 *
 * The rename to Paxel's vocabulary happens in `toPaxelAddress` and nowhere else, so
 * there is exactly one place to look when a courier is routed to the wrong kecamatan.
 */
export interface ShippingDestination {
  province: string;
  district: string; // Kabupaten / Kota
  sub_district: string; // Kecamatan
  village: string; // Kelurahan / Desa
  address: string;
  postalCode: number | string;
  latitude: number;
  longitude: number;
  fullname?: string;
  phone?: string;
  email?: string;
  note?: string;
}

/** Paxel validates `zip_code` at max 5 characters and Indonesian codes are always 5 digits. */
const formatZip = (postalCode: number | string): string => String(postalCode).replace(/\D/g, "").padStart(5, "0").slice(0, 5);

/**
 * Indonesian mobile numbers reach us as `08…`; Paxel's INSTANT documentation shows
 * `628…` and caps the field at 13 characters. Normalising to the 62 form satisfies
 * both, and a number that is already international is left alone.
 */
const formatPhone = (phone: string | undefined): string => {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) return digits.slice(0, 13);
  if (digits.startsWith("0")) return `62${digits.slice(1)}`.slice(0, 13);
  return digits.slice(0, 13);
};

/** Paxel caps `note` at 150 characters and rejects the whole request if it is longer. */
const clamp = (value: string | undefined | null, max: number): string => (value ?? "").slice(0, max);

const toRateAddress = (destination: ShippingDestination): PaxelRateAddress => ({
  address: clamp(destination.address, 350),
  province: destination.province,
  city: destination.district,
  district: destination.sub_district,
  village: destination.village,
  zip_code: formatZip(destination.postalCode),
  latitude: destination.latitude,
  longitude: destination.longitude,
});

const toPaxelAddress = (destination: ShippingDestination): PaxelAddress => ({
  name: clamp(destination.fullname, 100) || "Customer",
  email: destination.email || undefined,
  phone: formatPhone(destination.phone),
  address: clamp(destination.address, 350),
  note: clamp(destination.note, 150),
  latitude: destination.latitude,
  longitude: destination.longitude,
  province: clamp(destination.province, 50),
  city: clamp(destination.district, 50),
  district: clamp(destination.sub_district, 50),
  village: clamp(destination.village, 50),
  zip_code: formatZip(destination.postalCode),
});

const originRateAddress = (origin: ShippingOrigin): PaxelRateAddress => ({
  address: origin.address.address,
  province: origin.address.province,
  city: origin.address.city,
  district: origin.address.district,
  village: origin.address.village,
  zip_code: origin.address.zip_code,
  latitude: origin.latitude,
  longitude: origin.longitude,
});

// ─────────────────────────────────────────────────────────────────────────────
// Quoting
// ─────────────────────────────────────────────────────────────────────────────

export interface PickupWindow {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string;
}

export interface ServiceQuote {
  serviceType: PaxelServiceType;
  available: boolean;
  /** Rupiah, rounded. Present only when `available`. */
  cost?: number;
  /** e.g. "Delivered today, 18:00–22:00" */
  etaLabel?: string;
  deliveryStart?: string;
  deliveryEnd?: string;
  pickupWindows?: PickupWindow[];
  /** Present only when `available` is false — a sentence a buyer can act on. */
  reason?: string;
  isMock?: boolean;
}

const ETA_LABELS: Record<PaxelServiceType, string> = {
  INSTANT: "Within hours",
  SAMEDAY: "Same day",
  NEXTDAY: "Next day",
  REGULAR: "2–4 days",
};

/** Flattens Paxel's nested `time_detail[].available_day.day_details[]` into a flat pickup-window list. */
const toPickupWindows = (timeDetail: PaxelTimeDetail[]): PickupWindow[] => {
  const windows: PickupWindow[] = [];

  for (const detail of timeDetail) {
    const days = detail.available_day?.day_details ?? [];

    if (days.length === 0) {
      // INSTANT returns a single open window with no day list.
      windows.push({ date: "", startTime: detail.time_pickup_start, endTime: detail.time_pickup_end });
      continue;
    }

    for (const day of days) {
      windows.push({ date: day.nearest_date, startTime: detail.time_pickup_start, endTime: detail.time_pickup_end });
    }
  }

  return windows;
};

const trimTime = (value: string | undefined): string => (value ?? "").slice(0, 5);

/**
 * Quotes one service.
 *
 * A service that Paxel will not price is not an error — it is an option the buyer
 * does not get, with a reason attached. Only a genuinely unexpected failure
 * propagates, so one dead service never takes the whole checkout down with it.
 */
const quoteOne = async (serviceType: PaxelServiceType, origin: ShippingOrigin, destination: ShippingDestination, parcel: ConsolidatedParcel): Promise<ServiceQuote> => {
  const fit = parcelFitsService(parcel, serviceType);

  // Checked before the call, not after: Paxel's oversize rejection is a 400 with an
  // empty body, which would reach the buyer as "something went wrong".
  if (!fit.fits) return { serviceType, available: false, reason: fit.reason };

  let rate: PaxelRateData;

  try {
    rate = await PaxelApi.getRate(serviceType, {
      origin: originRateAddress(origin),
      destination: toRateAddress(destination),
      weight: parcel.weightG,
      dimension: parcel.dimension,
      service_type: PAXEL_RATE_SERVICE_TYPE[serviceType],
    });
  } catch (error) {
    if (error instanceof PaxelError) {
      logger.warn("Paxel declined to quote a service", { serviceType, status: error.status, message: error.message });
      // 400 and 404 mean "not for this address"; anything else means Paxel is unwell,
      // and saying "not available" then would be a guess dressed as a fact.
      const reason = error.status === 400 || error.status === 404 ? "Not available for this address." : error.userMessage;
      return { serviceType, available: false, reason };
    }
    throw error;
  }

  // `fixed_price` is the quote for the weight and dimension we actually submitted.
  // small/medium/large are the tier table, and charging from those would mean
  // charging a price nobody quoted.
  const cost = toRupiah(rate.fixed_price ?? rate.custom_price ?? 0);

  if (!cost || cost <= 0) return { serviceType, available: false, reason: "Not available for this address." };

  const first = rate.time_detail?.[0];

  return {
    serviceType,
    available: true,
    cost,
    etaLabel: first ? `${ETA_LABELS[serviceType]}, ${trimTime(first.time_delivery_start)}–${trimTime(first.time_delivery_end)}` : ETA_LABELS[serviceType],
    deliveryStart: trimTime(first?.time_delivery_start),
    deliveryEnd: trimTime(first?.time_delivery_end),
    pickupWindows: toPickupWindows(rate.time_detail ?? []),
    isMock: rate.is_mock === true,
  };
};

/**
 * Quotes every enabled service in parallel and returns them in display order.
 *
 * All four are quoted together rather than one at a time so the buyer sees the real
 * trade-off, and so picking a different service costs no extra round trip.
 */
export const quoteServices = async (destination: ShippingDestination, parcel: ConsolidatedParcel, origin?: ShippingOrigin): Promise<{ quotes: ServiceQuote[]; origin: ShippingOrigin }> => {
  const resolvedOrigin = origin ?? (await getShippingOrigin());

  const ordered = PAXEL_SERVICE_TYPES.filter((serviceType) => resolvedOrigin.enabledServices.includes(serviceType));

  const quotes = await Promise.all(ordered.map((serviceType) => quoteOne(serviceType, resolvedOrigin, destination, parcel)));

  logCalculation("Paxel rates quoted", {
    parcel: `${parcel.dimension} @ ${parcel.weightG}g`,
    destination: `${destination.village}, ${destination.sub_district}, ${destination.district}`,
    results: quotes.map((quote) => `${quote.serviceType}:${quote.available ? quote.cost : "unavailable"}`).join(" "),
    mock: isPaxelMock(),
  });

  return { quotes, origin: resolvedOrigin };
};

// ─────────────────────────────────────────────────────────────────────────────
// Pickup datetime
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a pickup instant the way Paxel parses it: "YYYY-MM-DD HH:mm:ss", with no
 * offset, read in the store's local timezone.
 *
 * The server may well run in UTC while the store operates on WITA. Sending a UTC
 * wall-clock time would book a pickup eight hours out, which Paxel accepts without
 * complaint and the courier discovers the next morning.
 */
export const formatPickupDatetime = (date: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "00";

  // `en-CA` with hour12:false renders midnight as "24" in some ICU versions.
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}:${get("second")}`;
};

/** The date half of the same value, for `GET /shipments/:date/list`. */
export const formatPickupDate = (date: Date, timeZone: string): string => formatPickupDatetime(date, timeZone).slice(0, 10);

/**
 * Turns "date + HH:mm" chosen by an admin into a Date, interpreting the wall clock
 * in the store's timezone rather than the server's.
 */
export const parsePickupDatetime = (date: string, time: string, timeZone: string): Date => {
  // Start from the naive instant, then correct by however far the server's own zone
  // sits from the store's at that moment.
  const naive = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`);
  if (Number.isNaN(naive.getTime())) throw new Error(`Invalid pickup date/time: ${date} ${time}`);

  const rendered = formatPickupDatetime(naive, timeZone);
  const drift = new Date(`${rendered.replace(" ", "T")}`).getTime() - naive.getTime();

  return new Date(naive.getTime() - drift);
};

// ─────────────────────────────────────────────────────────────────────────────
// Status mapping
// ─────────────────────────────────────────────────────────────────────────────

type ShipmentStatusValue = "BOOKED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "FAILED";

const STATUS_MAP: Record<string, ShipmentStatusValue> = {
  RPC: "BOOKED",
  RTP: "BOOKED",
  COL: "BOOKED",
  RAP: "BOOKED",
  CONFIRMED: "BOOKED",
  PAPV: "PICKED_UP",
  POL: "IN_TRANSIT",
  POLXL: "IN_TRANSIT",
  ODL: "IN_TRANSIT",
  ODLXL: "IN_TRANSIT",
  POD: "IN_TRANSIT",
  COD: "IN_TRANSIT",
  PDO: "DELIVERED",
  CCS: "CANCELLED",
  PRJL: "FAILED",
  UNDLM: "FAILED",
  HAPH: "FAILED",
  RTN: "FAILED",
  FAILED3PL: "FAILED",
  ONHOLD3PL: "FAILED",
};

/**
 * Maps Paxel's code onto our coarse lifecycle.
 *
 * Their track endpoint sometimes returns the label ("Delivered") where the webhook
 * returns the code ("PDO"), so both forms are accepted. An unknown value keeps the
 * shipment where it is rather than inventing a transition.
 */
export const toShipmentStatus = (latestStatus: string | undefined | null, current: ShipmentStatusValue = "BOOKED"): ShipmentStatusValue => {
  if (!latestStatus) return current;

  const code = latestStatus.toUpperCase();
  if (STATUS_MAP[code]) return STATUS_MAP[code];

  const byLabel = Object.entries(STATUS_MAP).find(([key]) => paxelStatusLabel(key).toUpperCase() === code);
  return byLabel ? byLabel[1] : current;
};

export const isDelivered = (latestStatus: string | undefined | null): boolean => Boolean(latestStatus && PAXEL_DELIVERED_STATUSES.includes(latestStatus.toUpperCase()));

// ─────────────────────────────────────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────────────────────────────────────

export interface BookableLine {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  dimensions: { weight_g: number; length_cm: number; width_cm: number; height_cm: number };
}

const toPaxelItems = (lines: BookableLine[], category: string): PaxelItem[] =>
  lines.map((line) => ({
    code: clamp(line.sku, 32),
    name: clamp(line.name, 200),
    category: clamp(category, 50),
    is_fragile: false,
    // Paxel validates price at minimum 1, and a free line would otherwise 400.
    price: Math.max(1, Math.round(line.unitPrice)),
    quantity: line.quantity,
    // Their per-item bounds are 1..5000 g and 1..50 cm. These come from
    // `package_dimensions`, which an admin can set to anything.
    weight: Math.min(5000, Math.max(1, Math.round(line.dimensions.weight_g))),
    length: Math.min(50, Math.max(1, Math.round(line.dimensions.length_cm))),
    width: Math.min(50, Math.max(1, Math.round(line.dimensions.width_cm))),
    height: Math.min(50, Math.max(1, Math.round(line.dimensions.height_cm))),
  }));

export interface BookShipmentInput {
  orderId: string;
  invoiceNumber: string;
  serviceType: PaxelServiceType;
  destination: ShippingDestination;
  lines: BookableLine[];
  invoiceValue: number;
  pickupAt: Date;
  note?: string;
  bookedById?: string | null;
}

/**
 * Books a pickup and records it.
 *
 * The Paxel call happens first and the row is written only once it succeeds, so a
 * failed booking leaves nothing behind to clean up and can simply be retried. This
 * is why booking is a separate admin action rather than part of the payment
 * verification transaction: that transaction decrements stock, and a courier outage
 * must not be able to roll that back or, worse, half-apply it.
 */
export const bookShipment = async (input: BookShipmentInput) => {
  const origin = await getShippingOrigin();

  const payload: PaxelCreateShipmentRequest = {
    invoice_number: clamp(input.invoiceNumber, 32),
    payment_type: "CRD",
    invoice_value: Math.max(1, Math.round(input.invoiceValue)),
    origin: origin.address,
    destination: toPaxelAddress(input.destination),
    items: toPaxelItems(input.lines, origin.itemCategory),
    pickup_datetime: formatPickupDatetime(input.pickupAt, origin.timeZone),
    need_insurance: origin.needInsurance,
    note: clamp(input.note, 150) || undefined,
    is_dropship: false,
    service_type: input.serviceType,
  };

  const created = await PaxelApi.createShipment(payload);

  logger.info("Paxel shipment created", { orderId: input.orderId, airwaybillCode: created.airwaybill_code, serviceType: input.serviceType, mock: created.is_mock === true });

  return prisma.shipment.create({
    data: {
      orderId: input.orderId,
      airwaybillCode: created.airwaybill_code,
      serviceType: input.serviceType,
      status: "BOOKED",
      latestStatus: "RPC",
      shippingCost: created.shipping_cost,
      pickupDatetime: input.pickupAt,
      estimatedPickupDate: created.estimated_pickup_date,
      estimatedPickupMinTime: created.estimated_pickup_min_time,
      estimatedPickupMaxTime: created.estimated_pickup_max_time,
      estimatedArrivalDate: created.estimated_arrival_date,
      estimatedArrivalMinTime: created.estimated_arrival_min_time,
      estimatedArrivalMaxTime: created.estimated_arrival_max_time,
      isMock: created.is_mock === true,
      bookedById: input.bookedById ?? null,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Tracking and cancellation
// ─────────────────────────────────────────────────────────────────────────────

/** Pulls the latest status from Paxel and folds it into our row. */
export const refreshTracking = async (airwaybillCode: string) => {
  const tracked: PaxelShipmentData = await PaxelApi.trackShipment(airwaybillCode);

  const existing = await prisma.shipment.findUnique({ where: { airwaybillCode }, select: { id: true, status: true, orderId: true } });
  if (!existing) throw new Error(`No shipment recorded for airwaybill ${airwaybillCode}`);

  const status = toShipmentStatus(tracked.latest_status, existing.status as ShipmentStatusValue);
  const delivered = isDelivered(tracked.latest_status) || status === "DELIVERED";

  const shipment = await prisma.shipment.update({
    where: { airwaybillCode },
    data: {
      status,
      latestStatus: tracked.latest_status ?? null,
      logs: (tracked.logs ?? []) as unknown as Prisma.InputJsonValue,
      photoUrl: tracked.photo || null,
      signatureUrl: tracked.signature || null,
      cancellationReason: tracked.cancellation_reason || null,
      lastTrackedAt: new Date(),
      ...(delivered && tracked.delivery_datetime ? { deliveredAt: new Date(tracked.delivery_datetime.replace(" ", "T")) } : {}),
      ...(status === "CANCELLED" ? { cancelledAt: new Date() } : {}),
    },
  });

  // The order follows the parcel, but only forwards. An admin who has already
  // marked an order COMPLETED should not see it dragged back to SHIPPED by a
  // routine tracking refresh.
  if (delivered) {
    await prisma.order.updateMany({ where: { id: existing.orderId, status: "SHIPPED" }, data: { status: "COMPLETED" } });
  }

  return { shipment, tracked };
};

export const cancelShipment = async (airwaybillCode: string, reason: string) => {
  const trimmed = clamp(reason.trim(), 150);
  if (!trimmed) throw new Error("A cancellation reason is required");

  await PaxelApi.cancelShipment(airwaybillCode, { cancellation_reason: trimmed });

  logger.info("Paxel shipment cancelled", { airwaybillCode, reason: trimmed });

  return prisma.shipment.update({
    where: { airwaybillCode },
    data: { status: "CANCELLED", latestStatus: "CCS", cancelledAt: new Date(), cancellationReason: trimmed },
  });
};

/**
 * The day's pickups.
 *
 * Our own `Shipment` rows are the base list rather than Paxel's response, so a
 * booking always appears even if their list endpoint is briefly unavailable — the
 * screen is what an admin uses to check the courier is coming, and a blank page on
 * a courier-side hiccup is the one thing it must not do. Paxel's answer enriches
 * each row with live status and is merged in by airwaybill.
 */
export const listPickupsByDate = async (date: string) => {
  const anchor = new Date(`${date}T12:00:00`);
  if (Number.isNaN(anchor.getTime())) throw new Error(`Invalid date: ${date}. Expected YYYY-MM-DD.`);

  const { timeZone } = await getShippingOrigin();

  // A ±1 day window in the SERVER's zone, narrowed afterwards to the exact day in the
  // STORE's. Filtering directly on a server-local midnight boundary would show the
  // wrong day's pickups whenever the two zones differ — a UTC-hosted app serving a
  // WITA store would roll over at 4pm local.
  const start = new Date(anchor.getTime() - 36 * 60 * 60 * 1000);
  const end = new Date(anchor.getTime() + 36 * 60 * 60 * 1000);

  const window = await prisma.shipment.findMany({
    where: { pickupDatetime: { gte: start, lte: end } },
    orderBy: { pickupDatetime: "asc" },
    include: { order: { select: { id: true, fullname: true, email: true, village: true, sub_district: true, district: true, totalItemsSold: true } } },
  });

  const shipments = window.filter((shipment) => formatPickupDate(shipment.pickupDatetime, timeZone) === date);

  let remote: PaxelShipmentData[] = [];
  let remoteError: string | null = null;

  try {
    remote = await PaxelApi.listShipmentsByPickupDate(date);
  } catch (error) {
    remoteError = error instanceof PaxelError ? error.userMessage : "Live courier status is temporarily unavailable.";
    logger.warn("Paxel pickup list unavailable, falling back to stored shipments", { date, error: error instanceof Error ? error.message : String(error) });
  }

  const byCode = new Map(remote.map((entry) => [entry.airwaybill_code, entry]));

  return {
    date,
    remoteError,
    isMock: isPaxelMock(),
    shipments: shipments.map((shipment) => {
      const live = byCode.get(shipment.airwaybillCode);
      return {
        ...shipment,
        shippingCost: shipment.shippingCost.toNumber(),
        liveStatus: live?.latest_status ?? shipment.latestStatus,
        liveStatusLabel: paxelStatusLabel(live?.latest_status ?? shipment.latestStatus),
      };
    }),
  };
};
