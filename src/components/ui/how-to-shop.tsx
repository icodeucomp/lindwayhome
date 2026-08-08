"use client";

import * as React from "react";

import { Container, LocaleLink } from "@/components";

import { SectionHeading, useStoreProfile } from "@/components/ui/storefront";

import { socialLinks } from "@/static/navigation";

/**
 * "How to Shop" (reference/How to Shop.png).
 *
 * Two columns: numbered steps on the left, and the payment/assistance panels on the
 * right. Those panels read from the `store_profile` config group rather than the
 * hardcoded bank details v1 buried in `payment-step.tsx` (A9.12), so the account
 * numbers here and at checkout can never disagree.
 */

const steps = [
  {
    title: "Browse Our Collections",
    body: (
      <p>
        Start by exploring our curated categories, from everyday wear to artisanal custom pieces. Each product page includes detailed photos, descriptions, and fabric notes to help you make an
        informed choice.
      </p>
    ),
  },
  {
    title: "Select Your Style",
    body: (
      <div className="space-y-2">
        <p>Choose your preferred size and color (if available). For custom orders, you can provide specific measurements and style notes—we love bringing your vision to life.</p>
        <p>
          Need help choosing a size? Visit our{" "}
          <LocaleLink href="/customer-care/size-guide" className="underline text-primary underline-offset-2">
            Size Guide
          </LocaleLink>{" "}
          for detailed measurements.
        </p>
      </div>
    ),
  },
  {
    title: "Place Your Order",
    body: (
      <div className="space-y-2">
        <p>We offer two simple ways to order:</p>
        <p>Ready-to-Wear: Click &ldquo;Add to Cart&rdquo; and proceed to checkout directly from our website.</p>
        <p>
          Custom or Special Orders: Click{" "}
          <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="underline text-primary underline-offset-2">
            Order via WhatsApp
          </a>{" "}
          to chat with our team. Share your size, preferred style, and any special requests—we&apos;ll guide you through the next steps.
        </p>
      </div>
    ),
  },
  { title: "Secure Your Payment", body: <p>We accept the following payment methods (BCA BANK and MANDIRI BANK).</p> },
  {
    title: "Shipping & Delivery",
    body: (
      <div className="space-y-2">
        <p>Orders are processed within 1-3 business days. Custom-made items may take 21-30 working days, depending on the complexity.</p>
        <ul className="pl-5 space-y-1 list-disc">
          <li>We ship across Indonesia and offer international delivery upon request.</li>
          <li>You&apos;ll receive a tracking number once your order is on its way.</li>
        </ul>
      </div>
    ),
  },
  { title: "Need Assistance?", body: <p>Our team is here to help you with styling advice, fabric selections, or sizing questions. Reach out anytime via WhatsApp handy.</p> },
];

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-primary/30">
    <p className="px-6 py-4 text-lg bg-primary text-light font-heading uppercase tracking-widest">{title}</p>
    {children}
  </div>
);

export const HowToShop = () => {
  const { bankAccounts, contact } = useStoreProfile();
  const assistants = contact.assistants ?? [];

  return (
    <Container id="content" className="grid grid-cols-1 gap-12 py-16 lg:grid-cols-2 scroll-mt-40">
      <div>
        <SectionHeading title="How to Shop" description="From browsing to delivery, step by step." className="pb-8" />

        <ol className="list-none">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-6 py-6 border-b border-border">
              <span className="text-sm font-heading text-primary/70">{String(index + 1).padStart(2, "0")}</span>
              <div className="space-y-2">
                <h3 className="text-base font-heading uppercase tracking-widest text-primary">{step.title}</h3>
                <div className="text-sm leading-relaxed text-body">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-8">
        {bankAccounts.length > 0 && (
          <Panel title="Payment Information">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {bankAccounts.map((account) => (
                <div key={account.number} className="p-6 space-y-1 border-t border-primary/20 sm:border-l sm:first:border-l-0">
                  <p className="text-lg font-heading text-body">{account.bank}</p>
                  <p className="text-sm uppercase text-body/80">{account.holder}</p>
                  <p className="text-sm text-body/80">{account.number}</p>
                  {account.branch && <p className="pt-2 text-sm text-body/80">{account.branch}</p>}
                  {account.swift && (
                    <p className="text-sm text-body/80">
                      <span className="uppercase text-body/60">Swift code</span> {account.swift}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {(assistants.length > 0 || contact.instagram) && (
          <Panel title="Need Assistance?">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {assistants.map((assistant) => (
                <div key={assistant.whatsapp} className="p-6 space-y-1 border-t border-primary/20 sm:border-l sm:first:border-l-0">
                  <p className="text-lg font-heading text-body">{assistant.name}</p>
                  <p className="text-sm text-body/60">WhatsApp</p>
                  <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="text-sm text-body/80 hover:text-primary">
                    {assistant.whatsapp}
                  </a>
                </div>
              ))}
            </div>

            {contact.instagram && (
              <div className="p-6 space-y-1 border-t border-primary/20">
                <p className="text-lg font-heading text-body">Direct Message</p>
                <p className="text-sm text-body/60">Instagram</p>
                <a href={contact.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-body/80 hover:text-primary">
                  @mylindway
                </a>
              </div>
            )}
          </Panel>
        )}
      </div>
    </Container>
  );
};
