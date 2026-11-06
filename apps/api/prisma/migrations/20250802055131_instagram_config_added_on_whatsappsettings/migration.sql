/*
  Warnings:

  - You are about to drop the column `orgId` on the `MetaAssets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[igsId,orgId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[whatsappSettingsId]` on the table `MetaAssets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fbPageId]` on the table `WhatsappSettings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ibaId]` on the table `WhatsappSettings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `whatsappSettingsId` to the `MetaAssets` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MetaAssets" DROP CONSTRAINT "MetaAssets_orgId_fkey";

-- DropIndex
DROP INDEX "MetaAssets_orgId_key";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "followerCount" INTEGER,
ADD COLUMN     "igsId" TEXT,
ADD COLUMN     "isIgVerifiedUser" BOOLEAN,
ADD COLUMN     "profilePic" TEXT;

-- AlterTable
ALTER TABLE "MetaAssets" DROP COLUMN "orgId",
ADD COLUMN     "whatsappSettingsId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "fbPageId" TEXT,
ADD COLUMN     "ibaId" TEXT,
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "igUserName" TEXT,
ADD COLUMN     "pageAccessToken" TEXT,
ALTER COLUMN "phoneId" DROP NOT NULL,
ALTER COLUMN "accessToken_iv" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "wabaId" DROP NOT NULL,
ADD CONSTRAINT "WhatsappSettings_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_igsId_orgId_key" ON "Contact"("igsId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaAssets_whatsappSettingsId_key" ON "MetaAssets"("whatsappSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSettings_fbPageId_key" ON "WhatsappSettings"("fbPageId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSettings_ibaId_key" ON "WhatsappSettings"("ibaId");

-- AddForeignKey
ALTER TABLE "MetaAssets" ADD CONSTRAINT "MetaAssets_whatsappSettingsId_fkey" FOREIGN KEY ("whatsappSettingsId") REFERENCES "WhatsappSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
