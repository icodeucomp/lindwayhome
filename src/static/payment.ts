/**
 * Display maps for the `PaymentMethod` enum, which is unchanged in v2.
 *
 * These used to live in `categories.ts` alongside the `Categories` enum maps. That
 * enum is gone (D25), but payment methods are not — so they moved here rather than
 * being deleted with it.
 */

export const paymentMethodLabels = {
  BANK_TRANSFER: "Bank Transfer",
  QRIS: "QRIS",
};

export const paymentMethodColors = {
  BANK_TRANSFER: "bg-primary/10 text-primary",
  QRIS: "bg-body/10 text-body",
};
