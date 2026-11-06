-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "priceId" TEXT,
ADD COLUMN     "rateupPlanId" UUID,
ALTER COLUMN "planId" DROP NOT NULL,
ALTER COLUMN "subscriptionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_rateupPlanId_fkey" FOREIGN KEY ("rateupPlanId") REFERENCES "RateupPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
