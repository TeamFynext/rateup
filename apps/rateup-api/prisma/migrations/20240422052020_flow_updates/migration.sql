/*
  Warnings:

  - A unique constraint covering the columns `[flowId,orgId]` on the table `WaFlow` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "WaFlow_flowId_key";

-- CreateIndex
CREATE UNIQUE INDEX "WaFlow_flowId_orgId_key" ON "WaFlow"("flowId", "orgId");
