-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "shopOrderLimitNotifiedPeriod" DATE,
ADD COLUMN     "shopOrderLimitWarnedPeriod" DATE,
ADD COLUMN     "shopOrdersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shopOrdersPeriodStart" DATE;
