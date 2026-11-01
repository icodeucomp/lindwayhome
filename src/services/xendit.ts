import { randomUUID, timingSafeEqual } from "crypto";

import { logger } from "@/lib/logger";

import { XenditCreateInvoiceRequest, XenditExpireInvoiceResponse, XenditGetInvoiceResponse, XenditInvoiceResponse } from "@/types/xendit";

import { XENDIT_USER_MESSAGES, XenditError, xenditUserMessage } from "./xendit-error";

export { XenditError } from "./xendit-error";

/**
 * Low-level Xendit client. This module is the ONLY place that speaks Xendit's wire
 * format — HTTP transport, Basic Auth, and callback verification. Business rules
 * (what a status means for an order, stock reservation, retries) live in
 * `./payment`, the same split `./paxel` and `./shipment` already use.
 *
 * ## Authentication
 *
 * Every outgoing call carries HTTP Basic Auth with the Secret Key as the username
 * and an empty password — Xendit's own convention. There is no request signature to
 * compute for outgoing calls; the one thing that matters on the way IN is the
 * `x-callback-token` header Xendit sends with every callback (see
 * `verifyCallbackToken` below) — a static shared secret comparison, not a computed
 * signature, since that is the mechanism Xendit's own dashboard issues.
 *
 * ## Test vs live vs mock
 *
 * Unlike Midtrans or Paxel, Xendit has no separate sandbox base URL — the same
 * `https://api.xendit.co` serves both, and whether a call is "test mode" or "live"
 * is decided entirely by which kind of Secret Key you authenticate with (Xendit
 * issues distinct test and live keys from the same dashboard). `XENDIT_MODE=mock`
 * (or simply leaving `XENDIT_SECRET_KEY` unset) answers every call locally instead,
 * the same fallback Paxel uses and for the same reason: without it, every checkout
 * would fail outright on a machine that has never registered for Xendit. It is loud
 * (`logger.warn` on every call) and, because Xendit's Invoice page is just a normal
 * hosted URL rather than a JS widget, the mock invoice_url even opens — it just
 * cannot actually take a payment.
 */

const XENDIT_BASE_URL = "https://api.xendit.co";

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY || "";
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN || "";
const XENDIT_TIMEOUT_MS = Number(process.env.XENDIT_TIMEOUT_MS) || 15_000;

export const isXenditMock = (): boolean => process.env.XENDIT_MODE === "mock" || !XENDIT_SECRET_KEY;

const authHeader = (): string => `Basic ${Buffer.from(`${XENDIT_SECRET_KEY}:`).toString("base64")}`;

// ─────────────────────────────────────────────────────────────────────────────
// Callback verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies a callback came from Xendit by comparing the `x-callback-token` header
 * against the token configured on the Xendit dashboard (Settings → Webhooks).
 *
 * This must be checked BEFORE the payload is trusted for anything — before the
 * database is even queried. Compared in constant time: this is the one check
 * standing between an arbitrary POST and "mark this order paid", so a
 * timing-observable `===` is worth avoiding even though the token itself is long.
 */
export const verifyCallbackToken = (headerValue: string | null): boolean => {
  if (!XENDIT_CALLBACK_TOKEN) {
    logger.error("Xendit callback check skipped: XENDIT_CALLBACK_TOKEN is not set");
    return false;
  }
  if (!headerValue) return false;

  const expected = Buffer.from(XENDIT_CALLBACK_TOKEN);
  const actual = Buffer.from(headerValue);
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
};

// ─────────────────────────────────────────────────────────────────────────────
// Transport
// ─────────────────────────────────────────────────────────────────────────────

interface XenditRequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

interface XenditErrorBody {
  message?: string;
  error_code?: string;
}

const request = async <T>({ method, path, body }: XenditRequestOptions): Promise<T> => {
  const url = `${XENDIT_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), XENDIT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader(),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    logger.error("Xendit request failed before a response", { method, path, error: error instanceof Error ? error.message : String(error) });
    throw new XenditError(503, `Xendit request to ${method} ${path} failed to complete`, XENDIT_USER_MESSAGES[500], error);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();

  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    logger.error("Xendit returned a non-JSON body", { method, path, status: response.status, body: text.slice(0, 500) });
    throw new XenditError(502, `Xendit ${method} ${path} returned a non-JSON body`, XENDIT_USER_MESSAGES[500], text);
  }

  if (!response.ok) {
    const errorBody = parsed as XenditErrorBody;
    const detail = errorBody.message || errorBody.error_code || text;
    logger.error("Xendit returned an error", { method, path, status: response.status, detail });
    throw new XenditError(response.status, `Xendit ${method} ${path} responded ${response.status}: ${detail}`, xenditUserMessage(response.status), parsed);
  }

  return parsed as T;
};

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────────────────────────────────────

const mockReason = (): string => (process.env.XENDIT_MODE === "mock" ? "XENDIT_MODE=mock" : "XENDIT_SECRET_KEY is not set");

const mockInvoice = (externalId: string, amount: number): XenditInvoiceResponse => {
  const id = `mock-${randomUUID()}`;
  return {
    id,
    external_id: externalId,
    status: "PENDING",
    amount,
    invoice_url: `https://checkout-staging.xendit.co/web/${id}`,
    expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    currency: "IDR",
  };
};

export const XenditApi = {
  /** POST /v2/invoices */
  createInvoice: async (payload: XenditCreateInvoiceRequest): Promise<XenditInvoiceResponse> => {
    if (isXenditMock()) {
      logger.warn("Xendit mock response served", { call: "createInvoice", externalId: payload.external_id, reason: mockReason() });
      return mockInvoice(payload.external_id, payload.amount);
    }
    return request<XenditInvoiceResponse>({ method: "POST", path: "/v2/invoices", body: payload });
  },

  /** GET /v2/invoices/:invoice_id */
  getInvoice: async (invoiceId: string): Promise<XenditGetInvoiceResponse> => {
    if (isXenditMock()) {
      logger.warn("Xendit mock response served", { call: "getInvoice", invoiceId, reason: mockReason() });
      return mockInvoice(invoiceId, 0);
    }
    return request<XenditGetInvoiceResponse>({ method: "GET", path: `/v2/invoices/${encodeURIComponent(invoiceId)}` });
  },

  /**
   * POST /v2/invoices/:invoice_id/expire!
   *
   * The trailing "!" is not a typo — it is a documented quirk of Xendit's own API
   * surface, the same kind of sharp edge Paxel's signature formulas already are.
   */
  expireInvoice: async (invoiceId: string): Promise<XenditExpireInvoiceResponse> => {
    if (isXenditMock()) {
      logger.warn("Xendit mock response served", { call: "expireInvoice", invoiceId, reason: mockReason() });
      return { ...mockInvoice(invoiceId, 0), status: "EXPIRED" };
    }
    return request<XenditExpireInvoiceResponse>({ method: "POST", path: `/v2/invoices/${encodeURIComponent(invoiceId)}/expire!` });
  },
};
