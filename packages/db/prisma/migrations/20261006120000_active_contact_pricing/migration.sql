-- CreateEnum
CREATE TYPE "AddonKind" AS ENUM ('ACTIVE_CONTACTS', 'CAMPAIGN_CREDITS');

-- CreateEnum
CREATE TYPE "ActiveContactReason" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "activeContactLimitNotifiedPeriod" DATE,
ADD COLUMN     "activeContactsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activeContactsPeriodStart" DATE,
ADD COLUMN     "campaignCreditLimitNotifiedPeriod" DATE,
ADD COLUMN     "campaignCreditsPeriodStart" DATE,
ADD COLUMN     "campaignCreditsUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SubscriptionAddon" ADD COLUMN     "creditsGranted" INTEGER,
ADD COLUMN     "creditsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kind" "AddonKind" NOT NULL DEFAULT 'ACTIVE_CONTACTS';

-- CreateTable
CREATE TABLE "ActiveContact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "contactKey" TEXT NOT NULL,
    "contactId" UUID,
    "platform" "PlatformType" NOT NULL,
    "customerId" TEXT NOT NULL,
    "firstActiveAt" TIMESTAMP(3) NOT NULL,
    "reason" "ActiveContactReason" NOT NULL,

    CONSTRAINT "ActiveContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActiveContact_orgId_periodStart_platform_customerId_idx" ON "ActiveContact"("orgId", "periodStart", "platform", "customerId");

-- CreateIndex
CREATE INDEX "ActiveContact_orgId_firstActiveAt_idx" ON "ActiveContact"("orgId", "firstActiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveContact_orgId_periodStart_contactKey_key" ON "ActiveContact"("orgId", "periodStart", "contactKey");

-- CreateIndex
CREATE INDEX "SubscriptionAddon_orgId_kind_expiresAt_idx" ON "SubscriptionAddon"("orgId", "kind", "expiresAt");

-- AddForeignKey
ALTER TABLE "ActiveContact" ADD CONSTRAINT "ActiveContact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

