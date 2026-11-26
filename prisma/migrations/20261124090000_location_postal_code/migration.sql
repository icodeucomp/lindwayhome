-- AlterTable
-- Nullable, so it applies cleanly to a populated table: existing locations keep an empty postal code
-- until an admin fills it in, and the checkout then leaves the field for the buyer.
ALTER TABLE "locations" ADD COLUMN     "postal_code" TEXT;
