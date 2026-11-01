/**
 * Lives in its own module so `xendit.ts` can throw it without inviting an import
 * cycle later, the same reason `PaxelError` is split out from `paxel.ts`.
 */

/**
 * A Xendit failure a caller can branch on.
 *
 * `userMessage` is the sentence we are willing to show a buyer. Xendit's own error
 * bodies name internal validation fields (`"error_code": "DUPLICATE_EXTERNAL_ID_ERROR"`)
 * that mean nothing to a buyer and would tell an attacker more than we intend.
 */
export class XenditError extends Error {
  readonly status: number;
  readonly userMessage: string;
  readonly detail?: unknown;

  constructor(status: number, message: string, userMessage: string, detail?: unknown) {
    super(message);
    this.name = "XenditError";
    this.status = status;
    this.userMessage = userMessage;
    this.detail = detail;
  }
}

export const XENDIT_USER_MESSAGES: Record<number, string> = {
  400: "We could not start the payment for this order. Please go back and try again.",
  401: "The payment gateway rejected our credentials. Please contact us so we can complete your order.",
  404: "The payment gateway has no record of this transaction.",
  409: "We could not start the payment for this order. Please go back and try again.",
  500: "The payment gateway is temporarily unavailable. Please try again in a few minutes.",
};

export const xenditUserMessage = (status: number): string => XENDIT_USER_MESSAGES[status] ?? XENDIT_USER_MESSAGES[500];
