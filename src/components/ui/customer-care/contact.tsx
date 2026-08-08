"use client";

import * as React from "react";

import { Container, LocaleLink } from "@/components";

import { SectionHeading, StoreButton, useStoreProfile } from "@/components/ui/storefront";

import { socialLinks } from "@/static/navigation";

import { contactInquiriesApi } from "@/utils";

import { InquiryType } from "@/types";

import toast from "react-hot-toast";

/**
 * Contact form (reference/Contact.png), implementing F-45.
 *
 * Six inquiry types as radios, with a free-text box revealed only for OTHER. v1's
 * General / Partnership / Career tabs are gone.
 *
 * Submission goes to `POST /contact-inquiries`, which persists the row and fires the
 * dual notification (F-46). The mutation layer already raises its own error toast, so
 * this only reports success (§E4).
 */

const INQUIRY_OPTIONS: { value: InquiryType; label: string }[] = [
  { value: InquiryType.PRODUCT_INQUIRY, label: "Product Inquiry" },
  { value: InquiryType.WHOLESALE_B2B, label: "Wholesale / B2B" },
  { value: InquiryType.ORDER_SUPPORT, label: "Order Support" },
  { value: InquiryType.PARTNERSHIP, label: "Partnership" },
  { value: InquiryType.CUSTOM_ORDER, label: "Custom Order" },
  { value: InquiryType.OTHER, label: "Other" },
];

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <label className="block space-y-2">
    <span className="text-sm font-heading uppercase tracking-[0.1em] text-body">
      {label} {required && <span className="text-primary">*</span>}
    </span>
    {children}
  </label>
);

const inputClass = "w-full border border-primary/40 bg-transparent px-4 py-3 text-sm text-body outline-none transition-colors placeholder:text-body/40 focus:border-primary";

export const ContactContent = () => {
  const { bankAccounts, contact } = useStoreProfile();
  const assistants = contact.assistants ?? [];

  const [form, setForm] = React.useState({ fullname: "", email: "", phone: "", inquiryType: "" as InquiryType | "", otherDetail: "", message: "" });

  const { mutate, isPending } = contactInquiriesApi.useCreateContactInquiry({
    onSuccess: () => {
      toast.success("Thank you — we have received your message.");
      setForm({ fullname: "", email: "", phone: "", inquiryType: "", otherDetail: "", message: "" });
    },
  });

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.inquiryType) {
      toast.error("Please choose an inquiry type.");
      return;
    }

    mutate({
      fullname: form.fullname,
      email: form.email,
      phone: form.phone || null,
      inquiryType: form.inquiryType,
      // Sent only for OTHER; the server drops it for every other type anyway.
      otherDetail: form.inquiryType === InquiryType.OTHER ? form.otherDetail || null : null,
      message: form.message,
    });
  };

  return (
    <Container id="content" className="grid grid-cols-1 gap-12 py-16 lg:grid-cols-2 scroll-mt-40">
      {/* Contact details */}
      <div className="space-y-8">
        <SectionHeading title="Get in Touch" description="Reach us directly, or send a message using the form." />

        <div className="border border-primary/30">
          <p className="px-6 py-4 text-lg bg-primary text-light font-heading uppercase tracking-[0.1em]">Reach Us</p>

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

          <div className="p-6 space-y-1 border-t border-primary/20">
            <p className="text-lg font-heading text-body">Direct Message</p>
            <p className="text-sm text-body/60">Instagram</p>
            <a href={contact.instagram ?? socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-body/80 hover:text-primary">
              @mylindway
            </a>
          </div>

          {contact.address && (
            <div className="p-6 space-y-1 border-t border-primary/20">
              <p className="text-lg font-heading text-body">Atelier</p>
              <a href={contact.maps ?? socialLinks.maps} target="_blank" rel="noopener noreferrer" className="text-sm text-body/80 hover:text-primary">
                {contact.address}
              </a>
            </div>
          )}
        </div>

        {bankAccounts.length > 0 && (
          <p className="text-sm text-body/70">
            Looking for payment details? They are listed on{" "}
            <LocaleLink href="/customer-care/how-to-shop" className="underline text-primary underline-offset-2">
              How to Shop
            </LocaleLink>
            .
          </p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <p className="text-sm text-body">Our team is here to help. Leave us a message and we&apos;ll get back to you within 1–2 business days.</p>

        <fieldset className="space-y-4">
          <legend className="w-full pb-3 mb-4 text-base border-b font-heading uppercase tracking-[0.1em] border-primary text-body">Contact Information</legend>

          <Field label="Full name" required>
            <input required value={form.fullname} onChange={(event) => set("fullname", event.target.value)} placeholder="Enter here..." className={inputClass} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email address" required>
              <input required type="email" value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="Enter here..." className={inputClass} />
            </Field>
            <Field label="Phone number">
              <input value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="Enter here..." className={inputClass} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="w-full pb-3 mb-4 text-base border-b font-heading uppercase tracking-[0.1em] border-primary text-body">Inquiry Type</legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {INQUIRY_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 text-sm cursor-pointer text-body">
                <input
                  type="radio"
                  name="inquiryType"
                  value={option.value}
                  checked={form.inquiryType === option.value}
                  onChange={() => set("inquiryType", option.value)}
                  className="size-4 accent-primary"
                />
                <span className="uppercase tracking-[0.06em]">{option.label}</span>
              </label>
            ))}
          </div>

          {form.inquiryType === InquiryType.OTHER && (
            <input value={form.otherDetail} onChange={(event) => set("otherDetail", event.target.value)} placeholder="Enter here..." className={inputClass} />
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="w-full pb-3 mb-4 text-base border-b font-heading uppercase tracking-[0.1em] border-primary text-body">Message</legend>

          <Field label="Tell us about your inquiry" required>
            <textarea required rows={5} value={form.message} onChange={(event) => set("message", event.target.value)} placeholder="Share your question or request..." className={inputClass} />
          </Field>
        </fieldset>

        <StoreButton type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Submit"}
        </StoreButton>
      </form>
    </Container>
  );
};
