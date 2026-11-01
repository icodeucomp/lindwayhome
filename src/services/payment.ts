import { logCalculation, logger, orderInclude, prisma, sendOrderConfirmation } from "@/lib";

import { API_BASE_URL } from "@/utils";

import { XenditCreateInvoiceRequest, XenditInvoiceStatus } from "@/types/xendit";

import { XenditApi } from "./xendit";

/**
 * Everything the app knows about payment, expressed in our vocabulary.
 *
 * `./xendit` speaks Xendit's wire format and nothing else. This module is the only
 * translator between the two, and it owns the two things that matter most for a
 * transactional feature:
 *
 *  1. mapping Xendit's Invoice `status` onto our own coarse lifecycle, the same way
 *     `./shipment` maps Paxel's status codes;
 *  2. making the order confirmation and the stock-restoration paths idempotent, so
 *     a retried callback — or an admin clicking twice — can never double-apply.
 *
 * Nothing here writes a price onto an order. `checkout-token.ts` remains the only
 * path by which a price reaches `Order` (D8) — this module only reacts to whether
 * the already-signed amount got paid.
 */

const clamp = (value: string | undefined | null, max: number): string => (value ?? "").slice(0, max);

// ─────────────────────────────────────────────────────────────────────────────
// Initiating a payment
// ─────────────────────────────────────────────────────────────────────────────

export interface InitiatePaymentInput {
  orderId: string;
  gatewayOrderId: string;
  grossAmount: number;
  email: string;
  fullname: string;
  whatsappNumber: string;
}

export interface InitiatedPayment {
  invoiceUrl: string;
  invoiceId: string;
}

/**
 * Asks Xendit for a hosted Invoice for an already-created, already-reserved order.
 *
 * `success_redirect_url`/`failure_redirect_url` are deliberately omitted: this app
 * opens the invoice in a new tab and asks the buyer to come back rather than
 * redirecting the whole storefront away, so there is no page on our side to send
 * Xendit's own post-payment redirect back to without guessing the buyer's language
 * (the checkout is localized under `/[lang]/...`, which this service layer has no
 * request-scoped access to). The webhook, not the redirect, is what actually
 * confirms the order either way (§B6.3).
 */
export const initiateOrderPayment = async (input: InitiatePaymentInput): Promise<InitiatedPayment> => {
  const payload: XenditCreateInvoiceRequest = {
    external_id: input.gatewayOrderId,
    amount: Math.round(input.grossAmount),
    payer_email: input.email,
    description: `Lindway Home order ${input.orderId}`,
    customer: {
      given_names: clamp(input.fullname, 100) || "Customer",
      email: input.email,
      mobile_number: input.whatsappNumber,
    },
    currency: "IDR",
    // Matches the slowest-to-pay common channel (bank transfer/VA). QRIS and
    // e-wallets settle far sooner in practice; Xendit's own per-channel countdown
    // inside the hosted page governs those, this is only the invoice's own ceiling.
    invoice_duration: 24 * 60 * 60,
  };

  logger.info("Xendit invoice requested", { orderId: input.orderId, gatewayOrderId: input.gatewayOrderId, grossAmount: input.grossAmount });

  const invoice = await XenditApi.createInvoice(payload);

  return { invoiceUrl: invoice.invoice_url, invoiceId: invoice.id };
};

// ─────────────────────────────────────────────────────────────────────────────
// Status mapping
// ─────────────────────────────────────────────────────────────────────────────

export type CoarsePaymentStatus = "SETTLED" | "PENDING" | "EXPIRED" | "CANCELLED" | "DENIED" | "REFUNDED";

/**
 * Maps Xendit's Invoice status onto our coarse lifecycle. A basic Invoice
 * integration has no fraud-review step and no separate deny/cancel/refund status on
 * the callback itself (unlike Midtrans's card `capture` + `fraud_status`), so this
 * is a straight three-way split. `CANCELLED`, `DENIED` and `REFUNDED` remain valid
 * `PaymentTransactionStatus` values reachable only through an admin action.
 */
export const mapXenditStatus = (status: XenditInvoiceStatus): CoarsePaymentStatus => {
  switch (status) {
    case "PAID":
    case "SETTLED":
      return "SETTLED";
    case "EXPIRED":
      return "EXPIRED";
    case "PENDING":
    default:
      return "PENDING";
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Confirming a payment
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfirmPaymentInfo {
  source: "ADMIN" | "XENDIT";
  /** Xendit's own channel string ("BANK_TRANSFER","QRIS","EWALLET",...). Absent for an admin override. */
  paymentType?: string | null;
}

/**
 * Flips an order to PAID and credits `soldCount` — the confirmed-sale half of the
 * lifecycle. Stock itself is NOT touched here: it was already reserved (decremented)
 * at order creation, so confirming payment only has to count the sale, not move
 * inventory again.
 *
 * The `WHERE isPurchased: false AND status: "AWAITING_PAYMENT"` on the claiming
 * update is what makes this callable more than once safely — a retried callback
 * (Xendit retries a callback delivery on anything but a 2xx) or an admin clicking
 * "Verify" on an order the callback already settled both land here as a no-op
 * `applied: false` instead of double-crediting `soldCount`. Postgres serializes
 * concurrent UPDATEs to the same row, so two simultaneous callers cannot both see
 * `count === 1`.
 *
 * One deliberate consequence: an order that already moved to `CANCELLED` (its stock
 * restored by `releaseOrderPayment`) cannot be revived through this function — doing
 * so would need to re-validate and re-decrement stock, the same check order creation
 * already does, and a late/out-of-order "paid after all" notification for a cancelled
 * order is rare enough that it belongs in front of a human, not silently reapplied.
 */
export const confirmOrderPayment = async (orderId: string, info: ConfirmPaymentInfo) => {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, items: { select: { productId: true, quantity: true } } } });
    if (!existing) throw new Error(`Order "${orderId}" not found`);

    const paymentMethod = info.paymentType ?? (info.source === "ADMIN" ? "manual" : "unknown");

    // Guarding on `status: "AWAITING_PAYMENT"` too, not just `isPurchased: false`, matters
    // when notifications arrive out of order: without it, a `PAID` callback that lands
    // after the order was already released as CANCELLED (its stock restored by
    // `releaseOrderPayment`) would flip it back to PAID without ever re-reserving that
    // stock. Requiring both means exactly one of "settled" or "released" can ever win.
    const claimed = await tx.order.updateMany({
      where: { id: orderId, isPurchased: false, status: "AWAITING_PAYMENT" },
      data: { isPurchased: true, status: "PAID", paymentMethod },
    });

    if (claimed.count === 0) {
      logger.info("confirmOrderPayment: order already confirmed, ignoring duplicate", { orderId, source: info.source });
      return { applied: false as const, order: await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude }) };
    }

    for (const item of existing.items) {
      await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.quantity } } });
    }

    logCalculation("Order payment confirmed", { orderId, source: info.source, paymentMethod, lines: existing.items.length });

    return { applied: true as const, order: await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude }) };
  });

  // Sent here, not at order creation: the order used to be "confirmed" the moment a
  // buyer uploaded a receipt, but with a gateway an order can exist for a while
  // before anyone knows whether it will ever be paid or expire. An "Order
  // Confirmation" email for something that then auto-cancels is worse than a
  // slightly later one. Guarded by the same `applied` flag as everything else here,
  // so a duplicate notification cannot send it twice.
  if (result.applied) {
    try {
      await sendOrderConfirmation({
        orderId: result.order.id,
        email: result.order.email,
        address: result.order.address,
        whatsappNumber: result.order.whatsappNumber,
        postalCode: result.order.postalCode,
        totalPurchased: result.order.totalPurchased.toNumber(),
        shippingCost: result.order.shippingCost?.toNumber() ?? 0,
        totalItemsSold: result.order.totalItemsSold,
        isMember: result.order.isMember,
        paymentMethod: result.order.paymentMethod ?? "unknown",
        fullname: result.order.fullname,
        items: result.order.items.map((item) => ({
          product: { id: item.productId, name: item.product.name, price: item.unitPrice.toNumber() },
          selectedSize: item.selectedSize,
          quantity: item.quantity,
        })),
        baseUrl: API_BASE_URL!,
        createdAt: result.order.createdAt,
      });
    } catch (error) {
      // The order is already committed at this point — a failed email must not read
      // as a failed payment confirmation.
      logger.error("Send Order Confirmation failed", { orderId: result.order.id, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// Releasing a reservation (payment never completed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restores the stock reserved at checkout and cancels the order — the compensating
 * action for a payment that expired or was never initiated at all (a failed Xendit
 * call right after order creation).
 *
 * Scoped deliberately to orders still `AWAITING_PAYMENT`: an order that already
 * settled and is being cancelled afterwards is a refund, which is a different,
 * unbuilt concern (same boundary the codebase already draws around cancellation
 * today). The `WHERE status: "AWAITING_PAYMENT"` guard gives this the same
 * duplicate-safety as `confirmOrderPayment` — a callback that fires `EXPIRED` twice
 * restores stock once.
 */
export const releaseOrderPayment = async (orderId: string, reason: string) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, items: { select: { productId: true, selectedSize: true, quantity: true } } },
    });
    if (!existing) throw new Error(`Order "${orderId}" not found`);

    const claimed = await tx.order.updateMany({ where: { id: orderId, status: "AWAITING_PAYMENT" }, data: { status: "CANCELLED", cancelledAt: new Date() } });

    if (claimed.count === 0) {
      logger.info("releaseOrderPayment: order already left AWAITING_PAYMENT, ignoring duplicate", { orderId, reason });
      return { applied: false as const };
    }

    for (const item of existing.items) {
      const variant = await tx.productVariant.findFirst({ where: { productId: item.productId, size: { code: item.selectedSize.toUpperCase() } }, select: { id: true } });

      if (!variant) {
        // The size or product was removed after the order was placed. Nothing to
        // restore stock onto — logged rather than thrown, since the order still
        // needs to be cancelled either way.
        logger.warn("releaseOrderPayment: variant no longer exists, stock not restored", { orderId, productId: item.productId, selectedSize: item.selectedSize });
        continue;
      }

      await tx.productVariant.update({ where: { id: variant.id }, data: { quantity: { increment: item.quantity } } });
    }

    logCalculation("Order payment released, stock restored", { orderId, reason, lines: existing.items.length });

    return { applied: true as const };
  });
};
