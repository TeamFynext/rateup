/*
  Warnings:

  - You are about to drop the column `contactTags` on the `WhatsappSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WhatsappSettings" DROP COLUMN "contactTags";

-- CreateTable
CREATE TABLE "WaAccountSettings" (
    "orgId" UUID NOT NULL,
    "contactTags" TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- CreateIndex
CREATE UNIQUE INDEX "WaAccountSettings_orgId_key" ON "WaAccountSettings"("orgId");

-- AddForeignKey
ALTER TABLE "WaAccountSettings" ADD CONSTRAINT "WaAccountSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
