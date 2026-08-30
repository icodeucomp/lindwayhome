import { createHash } from "crypto";

import { logger } from "@/lib/logger";

import {
  PaxelCancelShipmentData,
  PaxelCancelShipmentRequest,
  PaxelCreateShipmentData,
  PaxelCreateShipmentRequest,
  PaxelEnvelope,
  PaxelRateData,
  PaxelRateRequest,
  PaxelServiceType,
  PaxelShipmentData,
} from "@/types/paxel";

import { PaxelError, paxelUserMessage as userMessageFor, PAXEL_USER_MESSAGES } from "./paxel-error";
import { buildMockResponse, isMockPath } from "./paxel-mock";

export { PaxelError } from "./paxel-error";

/**
 * Low-level Paxel eCommerce API client.
 *
 * This module is the ONLY place that speaks Paxel's wire format. It owns the two
 * things that are easy to get subtly wrong — the SHA-256 request signature and the
 * error mapping — and nothing else. Business rules live in `./shipment`.
 *
 * ## Authentication
 *
 * Every call carries `X-Paxel-API-Key`. Create and Cancel additionally carry
 * `X-Paxel-Signature`, computed from a handful of request fields plus the API
 * secret. The two formulas below reproduce the hashes published in the
 * documentation exactly; `npm run paxel:check` asserts that on every run, so a
 * refactor that quietly reorders the concatenation fails loudly instead of
 * producing 403s against a live key.
 *
 * ## Mock mode
 *
 * With no `PAXEL_API_KEY` set — or `PAXEL_MODE=mock` — every request is answered
 * locally by `./paxel-mock` with a response in the documented shape. That makes the
 * entire checkout, booking and tracking flow exercisable before Paxel issues a key,
 * and it is deliberately loud: `data.is_mock` is set on the way out, the admin UI
 * shows a MOCK badge, and every call is logged at warn level.
 */

const PAXEL_BASE_URL = process.env.PAXEL_BASE_URL || "https://stage-commerce-api.paxel.co/v1";
const PAXEL_API_KEY = process.env.PAXEL_API_KEY || "";
const PAXEL_API_SECRET = process.env.PAXEL_API_SECRET || "";
const PAXEL_TIMEOUT_MS = Number(process.env.PAXEL_TIMEOUT_MS) || 15_000;

/**
 * Mock mode is on when explicitly asked for, or whenever there is no API key to
 * call with. The fallback is what lets the app run today: without it every
 * checkout would 500 on a missing credential, which is a worse failure than an
 * obviously-fake quote.
 */
export const isPaxelMock = (): boolean => process.env.PAXEL_MODE === "mock" || !PAXEL_API_KEY;

export const paxelConfigured = (): boolean => Boolean(PAXEL_API_KEY && PAXEL_API_SECRET);

// ─────────────────────────────────────────────────────────────────────────────
// Signatures
// ─────────────────────────────────────────────────────────────────────────────

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

/** First `count` characters, or "" for a nullish/short value — Paxel slices without padding. */
const head = (value: string | undefined | null, count: number): string => (value ?? "").slice(0, count);

const tail = (value: string | undefined | null, count: number): string => (value ?? "").slice(-count);

/**
 * Create Shipment signature.
 *
 *   sha256( invoice_number[0..2] + origin.name[0..2] + destination.name[0..2] + items[0].name[0..2] + secret )
 *
 * Documented example: "A8" + "Jh" + "Jh" + "Sa" + "GK8BGUE0B2"
 *   → 8dc40976acaf29f423aa60c2ea9e2b826a5c7f804dc74b1ff116a8bfbddd7ef9
 */
export const signCreateShipment = (request: PaxelCreateShipmentRequest, secret: string = PAXEL_API_SECRET): string =>
  sha256(head(request.invoice_number, 2) + head(request.origin.name, 2) + head(request.destination.name, 2) + head(request.items[0]?.name, 2) + secret);

/**
 * Cancel Shipment signature.
 *
 *   sha256( airwaybill_code[-6..] + cancellation_reason[0..2] + secret )
 *
 * Documented example: "X8H3YN" + "pe" + "GK8BGUE0B2"
 *   → cb87694b606df7178d91aa4c9891e3d3d91a85278e9ea431a352425ddcbd6529
 */
export const signCancelShipment = (airwaybillCode: string, cancellationReason: string, secret: string = PAXEL_API_SECRET): string =>
  sha256(tail(airwaybillCode, 6) + head(cancellationReason, 2) + secret);

// ─────────────────────────────────────────────────────────────────────────────
// Transport
// ─────────────────────────────────────────────────────────────────────────────

interface PaxelRequestOptions {
  method: "GET" | "POST" | "PUT";
  path: string;
  body?: unknown;
  signature?: string;
}

const request = async <T>({ method, path, body, signature }: PaxelRequestOptions): Promise<T> => {
  const url = `${PAXEL_BASE_URL}${path}`;

  if (isPaxelMock()) {
    if (!isMockPath(method, path)) throw new PaxelError(404, `No mock handler for ${method} ${path}`, userMessageFor(404));
    logger.warn("Paxel mock response served", { method, path, reason: PAXEL_API_KEY ? "PAXEL_MODE=mock" : "PAXEL_API_KEY is not set" });
    return buildMockResponse<T>(method, path, body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAXEL_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Paxel-API-Key": PAXEL_API_KEY,
        ...(signature ? { "X-Paxel-Signature": signature } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    // A timeout or DNS failure is indistinguishable from Paxel being down, and both
    // must read as "try again" rather than "your address is wrong".
    logger.error("Paxel request failed before a response", { method, path, error: error instanceof Error ? error.message : String(error) });
    throw new PaxelError(503, `Paxel request to ${method} ${path} failed to complete`, PAXEL_USER_MESSAGES[500], error);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();

  if (!response.ok) {
    // Their 400 is documented with an empty body, so `text` is routinely "".
    logger.error("Paxel returned an error", { method, path, status: response.status, body: text.slice(0, 500) });
    throw new PaxelError(response.status, `Paxel ${method} ${path} responded ${response.status}: ${text || "(empty body)"}`, userMessageFor(response.status), text);
  }

  let envelope: PaxelEnvelope<T>;

  try {
    envelope = JSON.parse(text) as PaxelEnvelope<T>;
  } catch {
    logger.error("Paxel returned a non-JSON body", { method, path, body: text.slice(0, 500) });
    throw new PaxelError(502, `Paxel ${method} ${path} returned a non-JSON body`, PAXEL_USER_MESSAGES[500], text);
  }

  // `status_code` repeats the HTTP status inside the body. A 200 wrapper carrying a
  // non-200 code has happened often enough in courier APIs to be worth checking.
  if (envelope.status_code && envelope.status_code >= 400) {
    throw new PaxelError(envelope.status_code, `Paxel ${method} ${path} returned status_code ${envelope.status_code}: ${envelope.message}`, userMessageFor(envelope.status_code), envelope);
  }

  return envelope.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────────────────────────────────────

export const PaxelApi = {
  /**
   * POST /v1/rates/city — SAMEDAY · NEXTDAY · REGULAR
   * POST /v1/rates/instant — INSTANT
   *
   * Unsigned: rate checks carry the API key only.
   */
  getRate: async (serviceType: PaxelServiceType, payload: PaxelRateRequest): Promise<PaxelRateData> => {
    const path = serviceType === "INSTANT" ? "/rates/instant" : "/rates/city";
    return request<PaxelRateData>({ method: "POST", path, body: payload });
  },

  /** POST /v1/shipments — signed. */
  createShipment: async (payload: PaxelCreateShipmentRequest): Promise<PaxelCreateShipmentData> =>
    request<PaxelCreateShipmentData>({ method: "POST", path: "/shipments", body: payload, signature: signCreateShipment(payload) }),

  /** POST /v1/shipments/:airwaybill_code/cancel — signed. */
  cancelShipment: async (airwaybillCode: string, payload: PaxelCancelShipmentRequest): Promise<PaxelCancelShipmentData> =>
    request<PaxelCancelShipmentData>({
      method: "POST",
      path: `/shipments/${encodeURIComponent(airwaybillCode)}/cancel`,
      body: payload,
      signature: signCancelShipment(airwaybillCode, payload.cancellation_reason),
    }),

  /** GET /v1/shipments/:airwaybill_code — unsigned. */
  trackShipment: async (airwaybillCode: string): Promise<PaxelShipmentData> => request<PaxelShipmentData>({ method: "GET", path: `/shipments/${encodeURIComponent(airwaybillCode)}` }),

  /** GET /v1/shipments/:date/list — unsigned. `date` is YYYY-MM-DD. */
  listShipmentsByPickupDate: async (date: string): Promise<PaxelShipmentData[]> => {
    const data = await request<PaxelShipmentData[]>({ method: "GET", path: `/shipments/${encodeURIComponent(date)}/list` });
    return Array.isArray(data) ? data : [];
  },
};
