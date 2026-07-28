import { Resend } from "resend";

let client: Resend | null = null;

export const getResend = (): Resend => {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }

    client = new Resend(apiKey);
  }

  return client;
};

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.RESEND_EMAIL_FROM || "Lindway Home <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`🚀${new Date()} - Error sending email:`, error);
      return { success: false, error };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error(`🚀${new Date()} - Error sending email:`, error);
    return { success: false, error };
  }
};
