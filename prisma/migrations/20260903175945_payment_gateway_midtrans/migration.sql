-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'EXPIRED', 'CANCELLED', 'DENIED', 'REFUNDED');

-- AlterTable
-- Hand-edited from the generated drop-and-recreate (which would have nulled out
-- every existing order's paymentMethod): converting the column in place preserves
-- "BANK_TRANSFER"/"QRIS" as their literal text values instead of losing them.
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE TEXT USING "paymentMethod"::TEXT;
ALTER TABLE "orders" ALTER COLUMN "receiptImage" DROP NOT NULL;

-- DropEnum
DROP TYPE "PaymentMethod";

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'MIDTRANS',
    "gatewayOrderId" TEXT NOT NULL,
    "transactionId" TEXT,
    "snapToken" TEXT,
    "redirectUrl" TEXT,
    "paymentType" TEXT,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "rawNotification" JSONB,
    "paidAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_gatewayOrderId_key" ON "payment_transactions"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "payment_transactions_orderId_idx" ON "payment_transactions"("orderId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
