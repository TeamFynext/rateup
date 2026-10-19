-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN "reservedAt" TIMESTAMP(3),
ADD COLUMN "reviewReason" TEXT,
ADD COLUMN "amountDue" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "ShopOrder_status_checkoutExpiresAt_idx" ON "ShopOrder"("status", "checkoutExpiresAt");
