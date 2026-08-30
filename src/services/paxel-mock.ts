import {
  PaxelCancelShipmentData,
  PaxelCancelShipmentRequest,
  PaxelCreateShipmentData,
  PaxelCreateShipmentRequest,
  PaxelRateData,
  PaxelRateRequest,
  PaxelShipmentData,
  PaxelTimeDetail,
} from "@/types/paxel";

import { PaxelError, paxelUserMessage } from "./paxel-error";

/**
 * A local stand-in for the Paxel API.
 *
 * Purpose: make the whole shipping flow — quote, book, track, cancel, pickup list —
 * exercisable before Paxel issues an API key. Every response here is built in the
 * shape the documentation publishes, so swapping `PAXEL_MODE` to `live` changes the
 * transport and nothing else.
 *
 * It is a stand-in, not a simulator. Prices are plausible, not real. The one thing
 * it models faithfully on purpose is *coverage*: SAMEDAY and INSTANT only quote
 * within a single city, exactly as Paxel behaves, so the "this service is not
 * available for your address" path is reachable in development rather than being
 * discovered in production.
 *
 * Every mock payload carries `is_mock: true`, which the admin UI surfaces as a badge.
 * Nothing here is reachable once `PAXEL_API_KEY` is set unless `PAXEL_MODE=mock`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// In-memory shipment store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Booked mock shipments, so track/cancel/list have something to answer with.
 *
 * This is module scope, so a dev-server reload empties it. That is fine and
 * deliberate: our own `Shipment` table is the durable record, and the pickup-list
 * screen reads that table and merely enriches it from here. `trackShipment` also
 * synthesizes a reply for an airwaybill it has never seen, so a reload never leaves
 * an already-booked order untrackable.
 */
const MOCK_SHIPMENTS = new Map<string, PaxelShipmentData>();

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

let sequence = 0;

const randomSuffix = (): string => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

const pad = (value: number): string => String(value).padStart(2, "0");

const compactDate = (date: Date): string => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

const isoDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isoDateTime = (date: Date): string => `${isoDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

// ─────────────────────────────────────────────────────────────────────────────
// Rates
// ─────────────────────────────────────────────────────────────────────────────

const normalizeCity = (value: string | undefined): string =>
  (value ?? "")
    .toUpperCase()
    .replace(/^(KOTA|KABUPATEN|KAB\.?)\s+/, "")
    .trim();

/** Which of Paxel's three size tiers a parcel falls into, from its longest side and weight. */
const resolveTier = (dimension: string, weightG: number): { size: string; short: string; price: number } => {
  const sides = dimension.split("x").map((value) => Number(value) || 0);
  const longest = Math.max(...sides, 0);

  if (longest <= 20 && weightG <= 1000) return { size: "small", short: "SML", price: 14_000 };
  if (longest <= 35 && weightG <= 3000) return { size: "medium", short: "MED", price: 18_000 };
  return { size: "large", short: "LAR", price: 20_000 };
};

/** Rough per-service multipliers, chosen so the four options are visibly different in the UI. */
const SERVICE_MULTIPLIER: Record<string, number> = {
  REGULAR: 1,
  NEXTDAY: 1.25,
  SAMEDAY: 1.6,
  "INSTANT GOSEND": 3.5,
};

const buildTimeDetail = (serviceType: string, now: Date): PaxelTimeDetail[] => {
  if (serviceType === "INSTANT GOSEND") {
    return [{ time_pickup_start: "00:00:00", time_pickup_end: "24:00:00", time_delivery_start: "00:00:00", time_delivery_end: "24:00:00", service: "same_day" }];
  }

  const windows =
    serviceType === "SAMEDAY"
      ? [
          { pickup: ["08:00:00", "10:00:00"], delivery: ["18:00:00", "22:00:00"] },
          { pickup: ["10:00:00", "12:00:00"], delivery: ["18:00:00", "22:00:00"] },
        ]
      : [
          { pickup: ["09:00:00", "12:00:00"], delivery: ["10:00:00", "16:00:00"] },
          { pickup: ["13:00:00", "17:00:00"], delivery: ["14:00:00", "20:00:00"] },
        ];

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // SAMEDAY can still be picked up today; the rest start tomorrow.
  const firstOffset = serviceType === "SAMEDAY" ? 0 : 1;

  const dayDetails = Array.from({ length: 6 }, (_, index) => {
    const date = addDays(now, firstOffset + index);
    return { name: dayNames[date.getDay()], nearest_date: isoDate(date) };
  });

  return windows.map((window) => ({
    time_pickup_start: window.pickup[0],
    time_pickup_end: window.pickup[1],
    time_delivery_start: window.delivery[0],
    time_delivery_end: window.delivery[1],
    service: serviceType === "SAMEDAY" ? "same_day" : "next_day",
    available_day: { day_details: dayDetails, unavailable_day_details: [], unavailable_days: [] },
  }));
};

const mockRate = (payload: PaxelRateRequest, instant: boolean): PaxelRateData => {
  const originCity = normalizeCity(payload.origin.city);
  const destinationCity = normalizeCity(payload.destination.city);
  const serviceType = payload.service_type;

  // Coverage, modelled deliberately: door-to-door services only run inside one city.
  // This is the branch that makes "no service available for this address" testable.
  const sameCity = originCity !== "" && originCity === destinationCity;

  if ((serviceType === "SAMEDAY" || instant) && !sameCity) {
    throw new PaxelError(400, `Mock: ${serviceType} is not available from ${originCity || "(unknown)"} to ${destinationCity || "(unknown)"}`, paxelUserMessage(400));
  }

  const tier = resolveTier(payload.dimension, payload.weight);
  const multiplier = SERVICE_MULTIPLIER[serviceType] ?? 1;
  const distanceUplift = sameCity ? 1 : 1.8;

  const price = Math.round((tier.price * multiplier * distanceUplift) / 500) * 500;

  return {
    response_code: 0,
    service_name: "",
    city_origin: payload.origin.city?.toUpperCase() ?? "",
    city_destination: payload.destination.city?.toUpperCase() ?? "",
    small_price: 14_000,
    medium_price: 18_000,
    large_price: 20_000,
    custom_price: price,
    time_detail: buildTimeDetail(serviceType, new Date()),
    fixed_price: price,
    fixed_price_type: "dimension",
    fixed_short_size: tier.short,
    fixed_size: tier.size,
    is_mock: true,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Shipments
// ─────────────────────────────────────────────────────────────────────────────

const mockCreateShipment = (payload: PaxelCreateShipmentRequest): PaxelCreateShipmentData => {
  const now = new Date();
  const pickup = new Date(payload.pickup_datetime.replace(" ", "T"));
  const pickupDate = Number.isNaN(pickup.getTime()) ? now : pickup;

  sequence += 1;
  const airwaybillCode = `MOCK.LINDWAY-${compactDate(pickupDate)}-${sequence}-${randomSuffix()}`;

  const sameDay = payload.service_type === "SAMEDAY" || payload.service_type === "INSTANT";
  const arrival = sameDay ? pickupDate : addDays(pickupDate, payload.service_type === "NEXTDAY" ? 1 : 3);

  const shippingCost = payload.items.reduce((total, item) => total + item.quantity, 0) * 5_000 + 15_000;

  const created: PaxelCreateShipmentData = {
    airwaybill_code: airwaybillCode,
    shipping_cost: shippingCost,
    created_datetime: isoDateTime(now),
    estimated_pickup_date: isoDate(pickupDate),
    estimated_pickup_min_time: `${pad(pickupDate.getHours())}:00`,
    estimated_pickup_max_time: `${pad(Math.min(pickupDate.getHours() + 2, 23))}:00`,
    estimated_arrival_date: isoDate(arrival),
    estimated_arrival_min_time: sameDay ? "18:00" : "10:00",
    estimated_arrival_max_time: sameDay ? "22:00" : "16:00",
  };

  MOCK_SHIPMENTS.set(airwaybillCode, {
    airwaybill_code: airwaybillCode,
    invoice_number: payload.invoice_number,
    payment_type: payload.payment_type,
    invoice_value: payload.invoice_value,
    origin: payload.origin,
    destination: payload.destination,
    items: payload.items,
    pickup_datetime: payload.pickup_datetime,
    need_insurance: payload.need_insurance,
    note: payload.note,
    shipping_cost: shippingCost,
    created_datetime: created.created_datetime,
    estimated_pickup_date: created.estimated_pickup_date,
    estimated_pickup_min_time: created.estimated_pickup_min_time,
    estimated_pickup_max_time: created.estimated_pickup_max_time,
    estimated_arrival_date: created.estimated_arrival_date,
    estimated_arrival_min_time: created.estimated_arrival_min_time,
    estimated_arrival_max_time: created.estimated_arrival_max_time,
    photo: "",
    signature: "",
    latest_status: "RPC",
    delivery_datetime: "",
    logs: [{ created_datetime: created.created_datetime, name: "-", note: "Shipment request received", status: "RPC", counter: 0 }],
  });

  return { ...created, is_mock: true };
};

/**
 * Synthesizes a shipment for an airwaybill the store has forgotten (dev-server
 * reload) so tracking never dead-ends on an order we really did book.
 */
const synthesizeShipment = (airwaybillCode: string): PaxelShipmentData => {
  const now = isoDateTime(new Date());
  const blank = { name: "-", email: "", phone: "-", address: "-", note: "", province: "-", city: "-", district: "-", village: "-", zip_code: "-" };

  return {
    airwaybill_code: airwaybillCode,
    invoice_number: "-",
    payment_type: "CRD",
    invoice_value: 0,
    origin: blank,
    destination: blank,
    items: [],
    pickup_datetime: now,
    need_insurance: false,
    shipping_cost: 0,
    created_datetime: now,
    estimated_pickup_date: isoDate(new Date()),
    estimated_pickup_min_time: "09:00",
    estimated_pickup_max_time: "12:00",
    estimated_arrival_date: isoDate(new Date()),
    estimated_arrival_min_time: "14:00",
    estimated_arrival_max_time: "18:00",
    latest_status: "RTP",
    logs: [{ created_datetime: now, note: "Courier is on the way to pickup location", status: "RTP" }],
  };
};

/**
 * Advances a mock shipment through the real status sequence based on how long ago it
 * was booked, so an admin refreshing the tracking panel sees it actually move.
 */
const MOCK_PROGRESSION: { afterMinutes: number; status: string; note: string }[] = [
  { afterMinutes: 0, status: "RPC", note: "Shipment request received" },
  { afterMinutes: 1, status: "RTP", note: "Courier is on the way to pickup location" },
  { afterMinutes: 3, status: "COL", note: "Courier has arrived at pickup location" },
  { afterMinutes: 5, status: "PAPV", note: "Courier has picked up your shipment" },
  { afterMinutes: 8, status: "POL", note: "Package on transit" },
  { afterMinutes: 12, status: "POD", note: "Courier is on the way to destination" },
  { afterMinutes: 15, status: "PDO", note: "Delivery is completed" },
];

const mockTrackShipment = (airwaybillCode: string): PaxelShipmentData => {
  const stored = MOCK_SHIPMENTS.get(airwaybillCode);
  if (!stored) return { ...synthesizeShipment(airwaybillCode), is_mock: true };

  // A cancelled shipment stays cancelled — progression must not resurrect it.
  if (stored.latest_status === "CCS") return { ...stored, is_mock: true };

  const bookedAt = new Date(stored.created_datetime.replace(" ", "T")).getTime();
  const elapsedMinutes = (Date.now() - bookedAt) / 60_000;

  const reached = MOCK_PROGRESSION.filter((step) => elapsedMinutes >= step.afterMinutes);
  const current = reached[reached.length - 1] ?? MOCK_PROGRESSION[0];

  stored.latest_status = current.status;
  stored.logs = reached.map((step) => ({ created_datetime: isoDateTime(new Date(bookedAt + step.afterMinutes * 60_000)), name: "-", note: step.note, status: step.status, counter: 0 }));

  if (current.status === "PDO") stored.delivery_datetime = stored.logs[stored.logs.length - 1].created_datetime;

  return { ...stored, is_mock: true };
};

const mockCancelShipment = (airwaybillCode: string, payload: PaxelCancelShipmentRequest): PaxelCancelShipmentData => {
  const stored = MOCK_SHIPMENTS.get(airwaybillCode);

  if (stored) {
    // Paxel answers 410 Gone once the parcel is collected; mirror that so the admin
    // UI's "too late to cancel" branch is reachable without waiting on a real courier.
    const tracked = mockTrackShipment(airwaybillCode);
    if (["PAPV", "POL", "POD", "COD", "PDO"].includes(tracked.latest_status)) {
      throw new PaxelError(410, `Mock: ${airwaybillCode} is already ${tracked.latest_status} and can no longer be cancelled`, paxelUserMessage(410));
    }

    stored.latest_status = "CCS";
    stored.cancellation_reason = payload.cancellation_reason;
    stored.logs = [...stored.logs, { created_datetime: isoDateTime(new Date()), note: payload.cancellation_reason, status: "CCS" }];
  }

  return { airwaybill_code: airwaybillCode, cancellation_reason: payload.cancellation_reason, is_mock: true };
};

const mockListByPickupDate = (date: string): PaxelShipmentData[] => [...MOCK_SHIPMENTS.keys()].map((code) => mockTrackShipment(code)).filter((shipment) => shipment.pickup_datetime.startsWith(date));

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

const RATE_PATHS = ["/rates/city", "/rates/instant"];

const CANCEL_PATTERN = /^\/shipments\/(.+)\/cancel$/;
const LIST_PATTERN = /^\/shipments\/(\d{4}-\d{2}-\d{2})\/list$/;
const TRACK_PATTERN = /^\/shipments\/([^/]+)$/;

export const isMockPath = (method: string, path: string): boolean => {
  if (method === "POST") return RATE_PATHS.includes(path) || path === "/shipments" || CANCEL_PATTERN.test(path);
  if (method === "GET") return LIST_PATTERN.test(path) || TRACK_PATTERN.test(path);
  return false;
};

export const buildMockResponse = <T>(method: string, path: string, body: unknown): T => {
  if (method === "POST" && RATE_PATHS.includes(path)) {
    return mockRate(body as PaxelRateRequest, path === "/rates/instant") as T;
  }

  if (method === "POST" && path === "/shipments") {
    return mockCreateShipment(body as PaxelCreateShipmentRequest) as T;
  }

  const cancel = CANCEL_PATTERN.exec(path);
  if (method === "POST" && cancel) {
    return mockCancelShipment(decodeURIComponent(cancel[1]), body as PaxelCancelShipmentRequest) as T;
  }

  const list = LIST_PATTERN.exec(path);
  if (method === "GET" && list) {
    return mockListByPickupDate(list[1]) as T;
  }

  const track = TRACK_PATTERN.exec(path);
  if (method === "GET" && track) {
    return mockTrackShipment(decodeURIComponent(track[1])) as T;
  }

  throw new PaxelError(404, `No mock handler for ${method} ${path}`, paxelUserMessage(404));
};
