/*
  Warnings:

  - A unique constraint covering the columns `[psid,orgId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "PlatformType" ADD VALUE 'FACEBOOK';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "psid" TEXT;

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "fbUserName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_psid_orgId_key" ON "Contact"("psid", "orgId");
