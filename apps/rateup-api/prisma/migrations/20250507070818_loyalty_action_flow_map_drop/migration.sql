/*
  Warnings:

  - You are about to drop the `LoyaltyActionFlowMap` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[flowId]` on the table `LoyaltyAction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "LoyaltyActionFlowMap" DROP CONSTRAINT "LoyaltyActionFlowMap_actionId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyActionFlowMap" DROP CONSTRAINT "LoyaltyActionFlowMap_flowId_fkey";

-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "flowId" UUID;

-- DropTable
DROP TABLE "LoyaltyActionFlowMap";

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAction_flowId_key" ON "LoyaltyAction"("flowId");

-- AddForeignKey
ALTER TABLE "LoyaltyAction" ADD CONSTRAINT "LoyaltyAction_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "WaFlow"("dbFlowId") ON DELETE CASCADE ON UPDATE CASCADE;
