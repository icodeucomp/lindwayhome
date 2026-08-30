/**
 * Lives in its own module so `paxel.ts` and `paxel-mock.ts` can both throw it
 * without importing each other in a cycle.
 */

/**
 * A Paxel failure a caller can branch on.
 *
 * `userMessage` is the sentence we are willing to show a buyer. Paxel's own bodies
 * are frequently either empty (their documented 400 carries no body at all) or
 * internal ("General Error - any other errors not listed above"), so passing them
 * through to the storefront would tell the buyer nothing and an attacker something.
 */
export class PaxelError extends Error {
  readonly status: number;
  readonly userMessage: string;
  readonly detail?: unknown;

  constructor(status: number, message: string, userMessage: string, detail?: unknown) {
    super(message);
    this.name = "PaxelError";
    this.status = status;
    this.userMessage = userMessage;
    this.detail = detail;
  }
}

export const PAXEL_USER_MESSAGES: Record<number, string> = {
  400: "We could not arrange a courier for these details. Please check the address and try again.",
  401: "The courier service rejected our credentials. Please contact us so we can complete your order.",
  403: "The courier service refused this request. Please contact us so we can complete your order.",
  404: "The courier service has no record of this shipment.",
  410: "This shipment can no longer be changed — the courier has already collected it.",
  415: "The courier service rejected the request format.",
  500: "The courier service is temporarily unavailable. Please try again in a few minutes.",
};

export const paxelUserMessage = (status: number): string => PAXEL_USER_MESSAGES[status] ?? PAXEL_USER_MESSAGES[500];
