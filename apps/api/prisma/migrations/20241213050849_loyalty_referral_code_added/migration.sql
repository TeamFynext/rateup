/*
  Warnings:

  - A unique constraint covering the columns `[requestMessage,orgId]` on the table `LoyaltyTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LoyaltyActionCustomerMap_customerId_actionId_key";

-- DropIndex
DROP INDEX "LoyaltyTemplate_orgId_key";

-- AlterTable
ALTER TABLE "LoyaltyTemplate" ADD COLUMN     "requestMessage" TEXT;

-- CreateTable
CREATE TABLE "LoyaltyReferralCode" (
    "referralCode" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "actionId" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReferralCode_referralCode_key" ON "LoyaltyReferralCode"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReferralCode_customerId_actionId_key" ON "LoyaltyReferralCode"("customerId", "actionId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTemplate_requestMessage_orgId_key" ON "LoyaltyTemplate"("requestMessage", "orgId");

-- AddForeignKey
ALTER TABLE "LoyaltyReferralCode" ADD CONSTRAINT "LoyaltyReferralCode_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReferralCode" ADD CONSTRAINT "LoyaltyReferralCode_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "LoyaltyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
