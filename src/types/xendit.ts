/**
 * Xendit Invoices — wire types.
 *
 * Mirrors `src/types/paxel.ts`: field-for-field against the published contract,
 * Xendit's own naming kept as-is so this file can be diffed against their docs
 * directly. `@/services/xendit` is the only module that builds or reads these
 * shapes; `@/services/payment` maps them onto our own domain types.
 *
 * Source: https://developers.xendit.co/api-reference/#create-invoice
 *         https://developers.xendit.co/api-reference/#invoice-callback
 */

// ─────────────────────────────────────────────────────────────────────────────
// Create Invoice — POST /v2/invoices
// ─────────────────────────────────────────────────────────────────────────────

export interface XenditCustomer {
  given_names?: string;
  email?: string;
  mobile_number?: string;
}

export interface XenditCreateInvoiceRequest {
  /** Globally unique, forever, per account. Never reused once an invoice reaches a final state. */
  external_id: string;
  amount: number;
  payer_email?: string;
  description?: string;
  customer?: XenditCustomer;
  currency?: "IDR";
  /** Seconds until the invoice itself expires. Xendit defaults to 24h when omitted. */
  invoice_duration?: number;
  success_redirect_url?: string;
  failure_redirect_url?: string;
}

export interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: XenditInvoiceStatus;
  amount: number;
  invoice_url: string;
  expiry_date: string;
  currency: string;
  payment_method?: string;
  payment_channel?: string;
  paid_amount?: number;
  paid_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Callback — POST <our webhook>, sent by Xendit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Xendit's own Invoice status vocabulary. A basic Invoice integration (no fraud
 * review step, unlike Midtrans's card `capture`) only ever reports these three.
 */
export type XenditInvoiceStatus = "PENDING" | "PAID" | "SETTLED" | "EXPIRED";

export interface XenditCallbackPayload {
  id: string;
  external_id: string;
  status: XenditInvoiceStatus;
  amount: number;
  paid_amount?: number;
  /** e.g. "BANK_TRANSFER", "EWALLET", "QR_CODE", "CREDIT_CARD", "RETAIL_OUTLET" */
  payment_method?: string;
  /** e.g. "BCA", "OVO", "QRIS", "ALFAMART" — the specific channel within payment_method */
  payment_channel?: string;
  currency: string;
  paid_at?: string;
  created: string;
  updated: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Invoice — GET /v2/invoices/:invoice_id
// ─────────────────────────────────────────────────────────────────────────────

export type XenditGetInvoiceResponse = XenditInvoiceResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Expire Invoice — POST /v2/invoices/:invoice_id/expire!
// ─────────────────────────────────────────────────────────────────────────────

export type XenditExpireInvoiceResponse = XenditInvoiceResponse;
