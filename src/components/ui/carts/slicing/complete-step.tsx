"use client";

import { StoreButton } from "@/components/ui/storefront";

import { formatIDR } from "@/utils";

import { CheckoutFormData } from "@/types";

import { PiCheckCircle } from "react-icons/pi";

/**
 * The closing step of the checkout wizard.
 *
 * It deliberately does not promise the order is paid: the buyer saying "I've
 * completed payment" means they finished the flow on Xendit's hosted page, not that
 * the payment has settled — that confirmation still comes from Xendit's webhook
 * (§B6.3), and claiming "payment received" here would be a claim the system cannot
 * yet make.
 */

interface CompleteStepProps {
  formData: CheckoutFormData;
  totalItem: number;
  onClose: () => void;
  totalPurchased: number;
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-b-0">
    <span className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">{label}</span>
    <span className="text-sm text-right text-body wrap-break-words">{children}</span>
  </div>
);

export const CompleteStep = ({ formData, totalItem, onClose, totalPurchased }: CompleteStepProps) => (
  <div className="space-y-8">
    <div className="space-y-3 text-center">
      <PiCheckCircle className="mx-auto size-12 text-primary" />
      <h2 className="text-2xl uppercase font-heading text-primary tracking-[0.06em]">Order Received</h2>
      <p className="max-w-md mx-auto text-sm text-body/70">
        Thank you — {totalItem} item{totalItem > 1 ? "s" : ""} {totalItem > 1 ? "are" : "is"} reserved for you. We&rsquo;re confirming your payment now and will email you the moment it&rsquo;s
        through.
      </p>
    </div>

    <div className="border-t border-border">
      <Row label="Order Total">
        <span className="font-heading">{formatIDR(totalPurchased)}</span>
      </Row>
      <Row label="Name">{formData.fullname}</Row>
      <Row label="Confirmation Sent To">{formData.email}</Row>
    </div>

    <StoreButton onClick={onClose} className="w-full">
      Continue Shopping
    </StoreButton>
  </div>
);
