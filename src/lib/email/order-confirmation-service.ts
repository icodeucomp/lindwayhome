import { sendEmail } from "./nodemailer";

import { generateOrderConfirmationHTML } from "./order-confirmation-template";

import { RequestDataForEmail } from "@/types";

export const sendOrderConfirmation = async (params: RequestDataForEmail) => {
  const html = generateOrderConfirmationHTML(params);

  return await sendEmail({
    to: params.email,
    subject: `Order Confirmation - ${params.guestId}`,
    html,
  });
};
