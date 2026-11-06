/*
  Warnings:

  - You are about to drop the column `currentScreen` on the `WaAutomatedReplyMessage` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `WaAutomatedReplyMessage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "WaAutomationProgressStatus" AS ENUM ('inProgress', 'paused', 'completed');

-- AlterTable
ALTER TABLE "WaAutomatedReplyMessage" DROP COLUMN "currentScreen",
DROP COLUMN "message",
ADD COLUMN     "currentNode" TEXT,
ADD COLUMN     "response" JSONB,
ADD COLUMN     "status" "WaAutomationProgressStatus" NOT NULL DEFAULT 'inProgress';
