import { sendEmail } from "./resend";

/**
 * Dual notification for a new contact inquiry (F-46): an acknowledgement to the person
 * who wrote in, and an alert to the admin inbox.
 *
 * EN only, like the order confirmation (D3).
 *
 * The inquiry is already persisted by the time this runs, so a mail failure must not
 * fail the request — `ContactInquiry` is the record of truth and the admin inbox
 * (F-47) shows it regardless of whether the email went out.
 */

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const INQUIRY_LABELS: Record<string, string> = {
  PRODUCT_INQUIRY: "Product Inquiry",
  ORDER_SUPPORT: "Order Support",
  CUSTOM_ORDER: "Custom Order",
  WHOLESALE_B2B: "Wholesale / B2B",
  PARTNERSHIP: "Partnership",
  OTHER: "Other",
};

export interface ContactInquiryEmailParams {
  id: string;
  fullname: string;
  email: string;
  phone?: string | null;
  inquiryType: string;
  otherDetail?: string | null;
  message: string;
}

const shell = (heading: string, body: string) => `
  <div style="font-family: Helvetica, Arial, sans-serif; color: #39322c; background: #faf6f5; padding: 32px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px;">
      <h1 style="color: #ba8164; font-size: 20px; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 16px;">${heading}</h1>
      ${body}
      <p style="margin-top: 32px; font-size: 12px; color: #39322c99;">Lindway &mdash; House of Artisanal Fashion<br/>Jalan Hayam Wuruk Gang XVII No. 36 Denpasar Timur, Bali 80239, Indonesia</p>
    </div>
  </div>
`;

const detailRows = (params: ContactInquiryEmailParams) =>
  [
    ["Name", params.fullname],
    ["Email", params.email],
    ["Phone", params.phone || "—"],
    ["Type", INQUIRY_LABELS[params.inquiryType] ?? params.inquiryType],
    ...(params.otherDetail ? [["Detail", params.otherDetail]] : []),
  ]
    .map(([label, value]) => `<tr><td style="padding: 4px 12px 4px 0; color: #39322c99; font-size: 13px;">${label}</td><td style="padding: 4px 0; font-size: 13px;">${escapeHtml(String(value))}</td></tr>`)
    .join("");

export const sendContactInquiryEmails = async (params: ContactInquiryEmailParams) => {
  const message = escapeHtml(params.message).replace(/\n/g, "<br/>");

  const customer = sendEmail({
    to: params.email,
    subject: "We received your message — Lindway",
    html: shell(
      "Thank you for reaching out",
      `<p style="font-size: 14px; line-height: 1.6;">Hi ${escapeHtml(params.fullname)},</p>
       <p style="font-size: 14px; line-height: 1.6;">We have received your message and will get back to you within 1&ndash;2 business days.</p>
       <p style="font-size: 13px; color: #39322c99; margin-top: 24px;">Your message</p>
       <p style="font-size: 14px; line-height: 1.6; border-left: 2px solid #ba8164; padding-left: 12px;">${message}</p>`,
    ),
  });

  const adminAddress = process.env.CONTACT_INBOX_EMAIL || process.env.RESEND_EMAIL_FROM;

  const admin = adminAddress
    ? sendEmail({
        to: adminAddress,
        subject: `New inquiry: ${INQUIRY_LABELS[params.inquiryType] ?? params.inquiryType} — ${params.fullname}`,
        html: shell(
          "New contact inquiry",
          `<table style="border-collapse: collapse; margin-bottom: 16px;">${detailRows(params)}</table>
           <p style="font-size: 14px; line-height: 1.6; border-left: 2px solid #ba8164; padding-left: 12px;">${message}</p>
           <p style="font-size: 12px; color: #39322c99; margin-top: 24px;">Reference ${params.id}</p>`,
        ),
      })
    : Promise.resolve({ success: false, error: "CONTACT_INBOX_EMAIL is not set" });

  return Promise.all([customer, admin]);
};
