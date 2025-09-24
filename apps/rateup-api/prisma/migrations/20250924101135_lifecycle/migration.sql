/*
  Warnings:

  - You are about to drop the `ContactLabelMap` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Labels` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StageCategory" AS ENUM ('active', 'won', 'lost');

-- DropForeignKey
ALTER TABLE "ContactLabelMap" DROP CONSTRAINT "ContactLabelMap_contactId_fkey";

-- DropForeignKey
ALTER TABLE "ContactLabelMap" DROP CONSTRAINT "ContactLabelMap_labelId_fkey";

-- DropForeignKey
ALTER TABLE "Labels" DROP CONSTRAINT "Labels_orgId_fkey";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "lifecycleId" UUID;

-- DropTable
DROP TABLE "ContactLabelMap";

-- DropTable
DROP TABLE "Labels";

-- CreateTable
CREATE TABLE "Lifecycle" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "category" "StageCategory" NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" UUID,

    CONSTRAINT "Lifecycle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lifecycle" ADD CONSTRAINT "Lifecycle_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_lifecycleId_fkey" FOREIGN KEY ("lifecycleId") REFERENCES "Lifecycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
