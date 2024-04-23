/*
  Warnings:

  - You are about to drop the column `email` on the `Contact` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Contact_email_orgId_key";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "email",
ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "contactTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
