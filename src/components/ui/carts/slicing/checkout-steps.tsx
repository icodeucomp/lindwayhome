"use client";

import { PiCheck } from "react-icons/pi";

/**
 * The three-step marker across the top of the checkout modal.
 *
 * The wizard already had three steps; nothing told the buyer that. On a screen that
 * asks for an address and then a payment receipt, "how much more of this is there"
 * is the question people abandon over.
 *
 * Completed steps show a tick rather than their number — the number is a position,
 * and once a step is behind you its position stops being the useful fact.
 */

export type CheckoutStep = "summary" | "payment" | "complete";

const STEPS: { key: CheckoutStep; label: string }[] = [
  { key: "summary", label: "Details" },
  { key: "payment", label: "Payment" },
  { key: "complete", label: "Done" },
];

export const CheckoutSteps = ({ current }: { current: CheckoutStep }) => {
  const activeIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <ol className="flex items-center gap-3 pb-6 list-none border-b border-border">
      {STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;

        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={`grid size-7 shrink-0 place-items-center border text-xs font-heading transition-colors ${
                isDone ? "border-primary bg-primary text-light" : isActive ? "border-primary text-primary" : "border-border text-body/40"
              }`}
            >
              {isDone ? <PiCheck className="size-3.5" /> : index + 1}
            </span>

            <span className={`font-heading text-xxs uppercase tracking-[0.16em] ${isActive ? "text-primary" : isDone ? "text-body/70" : "text-body/40"}`}>{step.label}</span>

            {index < STEPS.length - 1 && <span aria-hidden className={`h-px w-6 sm:w-12 ${isDone ? "bg-primary" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
};
