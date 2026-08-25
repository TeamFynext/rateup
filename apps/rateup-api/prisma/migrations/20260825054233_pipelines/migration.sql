/*
  Warnings:

  - A unique constraint covering the columns `[contactId,pipelineId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'ASSIGN_STAGE';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "integrationIds" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_contactId_pipelineId_key" ON "Lead"("contactId", "pipelineId");
