-- CreateTable
CREATE TABLE "LoyaltyApiSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "phoneKey" TEXT NOT NULL,
    "amountKey" TEXT NOT NULL,
    "actionId" UUID,
    "rewardId" UUID,
    "rules" JSONB NOT NULL,
    "priority" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LoyaltyApiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyApiSettings_actionId_key" ON "LoyaltyApiSettings"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyApiSettings_rewardId_key" ON "LoyaltyApiSettings"("rewardId");

-- CreateIndex
CREATE INDEX "LoyaltyApiSettings_orgId_feature_idx" ON "LoyaltyApiSettings"("orgId", "feature");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyApiSettings_orgId_priority_key" ON "LoyaltyApiSettings"("orgId", "priority");

-- AddForeignKey
ALTER TABLE "LoyaltyApiSettings" ADD CONSTRAINT "LoyaltyApiSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyApiSettings" ADD CONSTRAINT "LoyaltyApiSettings_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "LoyaltyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyApiSettings" ADD CONSTRAINT "LoyaltyApiSettings_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
