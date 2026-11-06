/*
  Warnings:

  - A unique constraint covering the columns `[phone,orgId]` on the table `LoyaltyCustomer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LoyaltyCustomer_phone_key";

-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "refereePoints" INTEGER;

-- AlterTable
ALTER TABLE "LoyaltyActionCustomerMap" ADD COLUMN     "refereePhone" TEXT;

-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "expireAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCustomer_phone_orgId_key" ON "LoyaltyCustomer"("phone", "orgId");
