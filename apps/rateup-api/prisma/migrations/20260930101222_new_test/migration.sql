-- AlterEnum
ALTER TYPE "TriggerEvent" ADD VALUE 'WOOCOMMERCE_EVENT';

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastErrorAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "enableWooOrderPoints" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "IntegrationEntityLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "integrationId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "rateupId" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationEntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEntityLink_integrationId_entityType_rateupId_key" ON "IntegrationEntityLink"("integrationId", "entityType", "rateupId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEntityLink_integrationId_entityType_externalId_key" ON "IntegrationEntityLink"("integrationId", "entityType", "externalId");

-- CreateIndex
CREATE INDEX "LeadActivity_type_createdAt_idx" ON "LeadActivity"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "IntegrationEntityLink" ADD CONSTRAINT "IntegrationEntityLink_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
