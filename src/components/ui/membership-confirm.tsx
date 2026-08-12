"use client";

import { useState } from "react";

import { ordersApi } from "@/utils";

import { Container } from "@/components";

import { StoreButton, StoreLinkButton } from "@/components/ui/storefront";

import { useLocaleHref } from "@/hooks";

import { PiCheckCircle, PiSealCheck, PiWarningCircle } from "react-icons/pi";

/**
 * The post-order screen (§A5.4). Despite the route being `/order/payment/success/[id]`,
 * this is not a receipt — it is the membership prompt (F-15), and the only place a
 * buyer is ever offered one.
 *
 * It is the first thing somebody sees after handing over money, so it says what has
 * actually happened: the order is received and the transfer is being checked by hand.
 * Claiming "payment successful" here would be a promise the system cannot keep until an
 * admin verifies the receipt (§A5.3).
 *
 * `window.location.href` on decline rather than a router push: the cart was just
 * emptied, and a hard navigation guarantees no stale client state rides along to the
 * homepage.
 */

type Status = "idle" | "loading" | "success" | "error";

const Panel = ({ children }: { children: React.ReactNode }) => (
  <Container className="flex items-center justify-center py-24">
    <div className="w-full max-w-lg p-10 space-y-6 text-center border border-border bg-light">{children}</div>
  </Container>
);

export const MembershipConfirm = ({ orderId }: { orderId: string }) => {
  const [status, setStatus] = useState<Status>("idle");
  const localeHref = useLocaleHref();

  const { mutate: activateMembership } = ordersApi.useActivateMembership({
    onSuccess: () => setStatus("success"),
    onError: () => setStatus("error"),
  });

  const handleConfirm = () => {
    setStatus("loading");
    activateMembership(orderId);
  };

  const handleDecline = () => {
    window.location.href = localeHref("/");
  };

  if (status === "loading") {
    return (
      <Panel>
        <span className="inline-block border-2 rounded-full size-10 animate-spin border-primary border-t-transparent" />
        <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Activating your membership…</p>
      </Panel>
    );
  }

  if (status === "error") {
    return (
      <Panel>
        <PiWarningCircle className="mx-auto size-12 text-primary" />
        <div className="space-y-2">
          <h1 className="text-2xl uppercase font-heading text-primary tracking-[0.06em]">Something went wrong</h1>
          <p className="text-sm text-body/70">We could not activate your membership just now. Your order is unaffected — you can try again, or ask us to switch it on later.</p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <StoreLinkButton href="/" variant="outline" className="w-full">
            Back to Home
          </StoreLinkButton>
          <StoreButton onClick={() => setStatus("idle")} className="w-full">
            Try Again
          </StoreButton>
        </div>
      </Panel>
    );
  }

  if (status === "success") {
    return (
      <Panel>
        <PiCheckCircle className="mx-auto size-12 text-primary" />
        <div className="space-y-2">
          <h1 className="text-2xl uppercase font-heading text-primary tracking-[0.06em]">You&apos;re a Member</h1>
          <p className="text-sm text-body/70">The member rate applies from your next order onwards. Nothing else to do — we recognise you by the email you checked out with.</p>
        </div>
        <StoreLinkButton href="/shop" className="w-full">
          Continue Shopping
        </StoreLinkButton>
      </Panel>
    );
  }

  return (
    <Panel>
      <PiSealCheck className="mx-auto size-12 text-primary" />

      <div className="space-y-2">
        <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Order Received</p>
        <h1 className="text-2xl uppercase font-heading text-primary tracking-[0.06em]">Become a Lindway Member?</h1>
        <p className="text-sm text-body/70">Members get our standing discount on every future order. It costs nothing, and you can decline now and ask us later.</p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <StoreButton variant="outline" onClick={handleDecline} className="w-full">
          No, Thanks
        </StoreButton>
        <StoreButton onClick={handleConfirm} className="w-full">
          Yes, Activate
        </StoreButton>
      </div>
    </Panel>
  );
};
