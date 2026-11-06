-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "sendWeeklyReport" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LoyaltyActionFlowMap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actionId" UUID NOT NULL,
    "flowId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyActionFlowMap_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LoyaltyActionFlowMap" ADD CONSTRAINT "LoyaltyActionFlowMap_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "LoyaltyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyActionFlowMap" ADD CONSTRAINT "LoyaltyActionFlowMap_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "WaFlow"("dbFlowId") ON DELETE CASCADE ON UPDATE CASCADE;
