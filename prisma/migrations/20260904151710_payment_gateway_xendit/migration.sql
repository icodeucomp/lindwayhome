-- Xendit replaces Midtrans as the payment gateway (D30 amendment).
-- `snapToken` was Midtrans-Snap-specific and has no Xendit equivalent — Xendit's
-- Invoice flow only ever needs `redirectUrl` (the hosted invoice URL). The one
-- existing non-null value was a fake token from local mock-mode testing.
ALTER TABLE "payment_transactions" DROP COLUMN "snapToken",
ALTER COLUMN "gateway" SET DEFAULT 'XENDIT';
