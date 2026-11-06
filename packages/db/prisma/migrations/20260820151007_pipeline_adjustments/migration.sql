/*
  Warnings:

  - You are about to drop the column `isWon` on the `PipelineStage` table. All the data in the column will be lost.
  - You are about to drop the column `lifecycleId` on the `PipelineStage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- DropForeignKey
ALTER TABLE "PipelineStage" DROP CONSTRAINT "PipelineStage_lifecycleId_fkey";

-- AlterTable
ALTER TABLE "PipelineStage" DROP COLUMN "isWon",
DROP COLUMN "lifecycleId",
ADD COLUMN     "status" "StageStatus" NOT NULL DEFAULT 'OPEN';
