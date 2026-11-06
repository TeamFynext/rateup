/*
  Warnings:

  - A unique constraint covering the columns `[orgId,name]` on the table `Integration` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "orgId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Integration_orgId_name_key" ON "Integration"("orgId", "name");
