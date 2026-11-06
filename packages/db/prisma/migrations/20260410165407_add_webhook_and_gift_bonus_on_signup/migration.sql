-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "refereeBonusType" TEXT NOT NULL DEFAULT 'points',
ADD COLUMN     "refereeRewardId" UUID,
ADD COLUMN     "referralBonusType" TEXT NOT NULL DEFAULT 'points',
ADD COLUMN     "referralRewardId" UUID;

-- CreateTable
CREATE TABLE "Webhook" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Webhook_orgId_key" ON "Webhook"("orgId");

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
