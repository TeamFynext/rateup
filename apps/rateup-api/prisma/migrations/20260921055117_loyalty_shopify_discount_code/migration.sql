-- AlterTable
ALTER TABLE "loyalty_redemptions" ADD COLUMN     "shopifyDiscountError" TEXT,
ADD COLUMN     "shopifyDiscountId" TEXT,
ADD COLUMN     "shopifyDiscountUrl" TEXT,
ADD COLUMN     "shopifySyncedAt" TIMESTAMP(3);
