-- DropForeignKey
ALTER TABLE "LoyaltyActionCustomerMap" DROP CONSTRAINT "LoyaltyActionCustomerMap_actionId_fkey";

-- AlterTable
ALTER TABLE "LoyaltyActionCustomerMap" ADD COLUMN     "amount" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "LoyaltyActionCustomerMap" ADD CONSTRAINT "LoyaltyActionCustomerMap_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "LoyaltyAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
