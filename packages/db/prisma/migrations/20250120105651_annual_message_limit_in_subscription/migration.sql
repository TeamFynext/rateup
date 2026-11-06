-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "isAnnualMessageLimit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "annualMessageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastMonthlyResettedDate" DATE;
