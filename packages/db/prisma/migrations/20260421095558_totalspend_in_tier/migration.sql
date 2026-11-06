-- AlterTable
ALTER TABLE "CustomerLoyaltyAccount" ADD COLUMN     "totalSpend" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LoyaltyTier" ALTER COLUMN "threshold" SET DEFAULT 0,
ALTER COLUMN "threshold" SET DATA TYPE DECIMAL(12,2);
