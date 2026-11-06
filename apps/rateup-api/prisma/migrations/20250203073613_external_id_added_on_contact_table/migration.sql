/*
  Warnings:

  - A unique constraint covering the columns `[external_id,orgId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "external_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_external_id_orgId_key" ON "Contact"("external_id", "orgId");
