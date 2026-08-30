-- Paxel shipping (CLAUDE.md D28, D29, §B6.5–B6.7).
--
-- Adds the courier destination to `orders` and introduces `shipments`.
--
-- NOTE ON THE NOT NULL COLUMNS
--
-- `prisma migrate dev` would emit a bare `ADD COLUMN ... NOT NULL` here, which
-- fails outright on a table that already has rows. Since the six new required
-- columns have no meaningful value for an order placed before this change, they
-- are added WITH a temporary default and the default is then dropped — so the
-- resulting column definition is identical to the schema (NOT NULL, no default)
-- and there is no drift, but the migration applies to a populated database
-- instead of refusing to.
--
-- Rows backfilled this way carry empty administrative levels and 0/0 coordinates,
-- which cannot be shipped. That is deliberate and visible rather than silent:
-- `npm run db:check` reports every such order under "Every order carries a
-- destination the courier can be sent to". Backfill or delete them before booking.

-- CreateEnum
CREATE TYPE "ShippingServiceType" AS ENUM ('SAMEDAY', 'NEXTDAY', 'REGULAR', 'INSTANT');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "addressNote" TEXT,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shippingServiceType" "ShippingServiceType" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "province" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "district" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sub_district" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "village" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "latitude" DECIMAL(10,7) NOT NULL DEFAULT 0,
ADD COLUMN     "longitude" DECIMAL(10,7) NOT NULL DEFAULT 0;

-- Drop the scaffolding defaults so the columns match the schema exactly.
ALTER TABLE "orders" ALTER COLUMN "province" DROP DEFAULT,
ALTER COLUMN "district" DROP DEFAULT,
ALTER COLUMN "sub_district" DROP DEFAULT,
ALTER COLUMN "village" DROP DEFAULT,
ALTER COLUMN "latitude" DROP DEFAULT,
ALTER COLUMN "longitude" DROP DEFAULT;

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "airwaybillCode" TEXT NOT NULL,
    "serviceType" "ShippingServiceType" NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'BOOKED',
    "latestStatus" TEXT,
    "shippingCost" DECIMAL(12,2) NOT NULL,
    "pickupDatetime" TIMESTAMP(3) NOT NULL,
    "estimatedPickupDate" TEXT,
    "estimatedPickupMinTime" TEXT,
    "estimatedPickupMaxTime" TEXT,
    "estimatedArrivalDate" TEXT,
    "estimatedArrivalMinTime" TEXT,
    "estimatedArrivalMaxTime" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "photoUrl" TEXT,
    "signatureUrl" TEXT,
    "logs" JSONB,
    "lastTrackedAt" TIMESTAMP(3),
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "bookedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_airwaybillCode_key" ON "shipments"("airwaybillCode");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_pickupDatetime_idx" ON "shipments"("pickupDatetime");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
