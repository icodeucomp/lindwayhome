import { formatUnderscoreToSpace } from "@/utils";

/**
 * Payment method display.
 *
 * v1 had two fixed methods (BANK_TRANSFER, QRIS) and a matching 2-entry map. v2's
 * gateway (Xendit) owns this vocabulary now — a `payment_channel` like "BCA",
 * "OVO" or "QRIS", falling back to the coarser `payment_method` ("BANK_TRANSFER",
 * "EWALLET", "RETAIL_OUTLET", …) when no channel was reported — and whatever
 * Xendit adds next needs no change here. `KNOWN_LABELS` is display polish for the
 * common ones; anything else still renders via the generic formatter instead of
 * crashing on a missing key, the same fallback shape `paxelStatusLabel` uses for
 * Paxel's status codes.
 */
const KNOWN_LABELS: Record<string, string> = {
  qris: "QRIS",
  ovo: "OVO",
  dana: "DANA",
  linkaja: "LinkAja",
  shopeepay: "ShopeePay",
  astrapay: "AstraPay",
  jeniuspay: "Jenius Pay",
  bca: "BCA",
  bni: "BNI",
  bri: "BRI",
  mandiri: "Mandiri",
  permata: "Permata",
  bank_transfer: "Bank Transfer",
  ewallet: "E-Wallet",
  credit_card: "Credit Card",
  retail_outlet: "Convenience Store",
  alfamart: "Alfamart",
  indomaret: "Indomaret",
};

/** `null` means payment hasn't settled yet — an order can sit in that state for a while. */
export const paymentMethodLabel = (method: string | null | undefined): string => {
  if (!method) return "Awaiting payment";
  return KNOWN_LABELS[method.toLowerCase()] ?? formatUnderscoreToSpace(method);
};

export const paymentMethodColor = (method: string | null | undefined): string => (method ? "bg-primary/10 text-primary" : "bg-body/10 text-body/50");
