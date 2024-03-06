/*
  Warnings:

  - A unique constraint covering the columns `[shortUrlId]` on the table `Menu` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "shortUrlId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Menu_shortUrlId_key" ON "Menu"("shortUrlId");
