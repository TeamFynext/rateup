/*
  Warnings:

  - A unique constraint covering the columns `[shortUrlId]` on the table `Org` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "shortUrlId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Org_shortUrlId_key" ON "Org"("shortUrlId");
