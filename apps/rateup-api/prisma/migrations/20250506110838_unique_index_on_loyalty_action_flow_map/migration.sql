/*
  Warnings:

  - A unique constraint covering the columns `[actionId]` on the table `LoyaltyActionFlowMap` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyActionFlowMap_actionId_key" ON "LoyaltyActionFlowMap"("actionId");
