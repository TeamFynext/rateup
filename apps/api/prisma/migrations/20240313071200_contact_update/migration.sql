/*
  Warnings:

  - You are about to drop the column `teamId` on the `Contact` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone,orgId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,orgId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orgId` to the `Contact` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_teamId_fkey";

-- DropIndex
DROP INDEX "Contact_email_teamId_key";

-- DropIndex
DROP INDEX "Contact_phone_teamId_key";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "teamId",
ADD COLUMN     "orgId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_orgId_key" ON "Contact"("phone", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_orgId_key" ON "Contact"("email", "orgId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
