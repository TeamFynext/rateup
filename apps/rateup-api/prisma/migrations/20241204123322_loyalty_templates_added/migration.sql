-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "teamId" UUID,
ADD COLUMN     "waTemplateId" UUID;

-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "teamId" UUID,
ADD COLUMN     "waTemplateId" UUID;

-- CreateTable
CREATE TABLE "LoyaltyTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "waTemplateId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" UUID,

    CONSTRAINT "LoyaltyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTemplate_orgId_key" ON "LoyaltyTemplate"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTemplate_type_orgId_key" ON "LoyaltyTemplate"("type", "orgId");

-- AddForeignKey
ALTER TABLE "LoyaltyAction" ADD CONSTRAINT "LoyaltyAction_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyAction" ADD CONSTRAINT "LoyaltyAction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTemplate" ADD CONSTRAINT "LoyaltyTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTemplate" ADD CONSTRAINT "LoyaltyTemplate_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTemplate" ADD CONSTRAINT "LoyaltyTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
