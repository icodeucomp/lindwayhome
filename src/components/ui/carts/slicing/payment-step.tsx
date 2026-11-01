"use client";

import * as React from "react";

import { StoreButton } from "@/components/ui/storefront";

import { formatIDR } from "@/utils";

import { CheckoutFormData } from "@/types";

import { PiArrowLeft, PiArrowSquareOut } from "react-icons/pi";

/**
 * Step 2 — payment.
 *
 * There is no method picker and no receipt upload any more (v1 had both — see git
 * history). Xendit's hosted Invoice page covers QRIS, bank transfer/VA, e-wallets
 * and retail outlets behind one link, and confirms payment itself via webhook
 * instead of an admin eyeballing a screenshot (§B6.3). This step's only job is:
 * create the order, open the invoice in a new tab, and let the buyer tell us when
 * they're done — NOT whether payment actually settled, which is still only known
 * once the webhook lands (see CompleteStep).
 *
 * A new tab rather than an in-page popup: Xendit's Invoice is a normal hosted page,
 * not a JS widget like Midtrans's Snap, so there is no `onSuccess`/`onPending`
 * callback available to this page. Keeping the checkout wizard open behind it is
 * what lets the buyer come straight back to "I've Completed Payment" instead of
 * losing their place.
 */

interface PaymentStepProps {
  formData: CheckoutFormData;
  onBack: () => void;
  /** Creates the order and its Xendit invoice — does not itself open the invoice. */
  onPayNow: () => void;
  /** The buyer says they finished paying. Does not mean payment settled — the webhook still owns that (§B6.3). */
  onPaid: () => void;
  isCreatingOrder: boolean;
}

export const PaymentStep = ({ formData, onBack, onPayNow, onPaid, isCreatingOrder }: PaymentStepProps) => {
  const openedUrlRef = React.useRef<string | null>(null);

  const openInvoice = React.useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // Opens automatically the moment a fresh invoice URL lands, so clicking "Pay Now"
  // only ever takes one click. `openedUrlRef` stops it firing twice for the same
  // invoice (a re-render, or React Strict Mode's dev double-invoke) — it only
  // re-opens when the URL itself changes, e.g. after a fresh order is created.
  React.useEffect(() => {
    if (!formData.invoiceUrl) return;
    if (openedUrlRef.current === formData.invoiceUrl) return;
    openedUrlRef.current = formData.invoiceUrl;
    openInvoice(formData.invoiceUrl);
  }, [formData.invoiceUrl, openInvoice]);

  const hasInvoice = Boolean(formData.invoiceUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} aria-label="Back to details" className="grid border size-9 place-items-center border-border text-body hover:border-primary hover:text-primary">
          <PiArrowLeft className="size-4" />
        </button>
        <h2 className="text-xl uppercase font-heading text-primary tracking-[0.06em]">Payment</h2>
      </div>

      <div className="flex items-baseline justify-between gap-4 py-4 border-y border-border">
        <span className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Total Due</span>
        <span className="text-2xl font-heading text-body">{formatIDR(formData.totalPurchased)}</span>
      </div>

      {hasInvoice ? (
        <div className="p-6 space-y-2 text-center border border-border bg-muted">
          <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Complete your payment</p>
          <p className="text-xs text-body/60">We opened your payment page in a new tab — QRIS, bank transfer, e-wallet or a convenience store, whichever you chose. Come back here once you&rsquo;re done.</p>
          <button
            type="button"
            onClick={() => openInvoice(formData.invoiceUrl!)}
            className="inline-flex items-center gap-1.5 pt-1 text-xxs uppercase tracking-[0.1em] text-primary hover:text-body"
          >
            Reopen payment page <PiArrowSquareOut className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-6 space-y-2 text-center border border-border bg-muted">
          <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Pay securely with Xendit</p>
          <p className="text-xs text-body/60">QRIS, bank transfer, e-wallet or a convenience store — choose whichever you like on the next page.</p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <StoreButton type="button" variant="outline" onClick={onBack} className="w-full" disabled={isCreatingOrder}>
          Back
        </StoreButton>
        <StoreButton type="button" onClick={hasInvoice ? onPaid : onPayNow} disabled={isCreatingOrder} className="w-full">
          {isCreatingOrder ? "Creating order…" : hasInvoice ? "I've Completed Payment" : "Pay Now"}
        </StoreButton>
      </div>
    </div>
  );
};
