/*
  Warnings:

  - You are about to drop the column `annualMessageCount` on the `UsageStats` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyMessagesCount` on the `UsageStats` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[monthlyPaymentPlanId]` on the table `RateupPlan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[yearlyPaymentPlanId]` on the table `RateupPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RateupPlan" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "monthlyPaymentPlanId" UUID,
ADD COLUMN     "monthlyPrice" DOUBLE PRECISION,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "yearlyPaymentPlanId" UUID,
ADD COLUMN     "yearlyPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "UsageStats" DROP COLUMN "annualMessageCount",
DROP COLUMN "monthlyMessagesCount",
ADD COLUMN     "annualConversationsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyConversationsCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "RateupPlan_monthlyPaymentPlanId_key" ON "RateupPlan"("monthlyPaymentPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "RateupPlan_yearlyPaymentPlanId_key" ON "RateupPlan"("yearlyPaymentPlanId");

-- AddForeignKey
ALTER TABLE "RateupPlan" ADD CONSTRAINT "RateupPlan_monthlyPaymentPlanId_fkey" FOREIGN KEY ("monthlyPaymentPlanId") REFERENCES "PaymentPlans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateupPlan" ADD CONSTRAINT "RateupPlan_yearlyPaymentPlanId_fkey" FOREIGN KEY ("yearlyPaymentPlanId") REFERENCES "PaymentPlans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
