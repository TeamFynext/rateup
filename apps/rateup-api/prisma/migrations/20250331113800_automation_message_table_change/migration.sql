/*
  Warnings:

  - You are about to drop the column `currentScreen` on the `WaAutomatedReplyMessage` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `WaAutomatedReplyMessage` table. All the data in the column will be lost.
  - Added the required column `currentNode` to the `WaAutomatedReplyMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WaAutomatedReplyMessage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WaAutomationProgressStatus" AS ENUM ('inProgress', 'paused', 'completed');

-- AlterTable
ALTER TABLE "WaAutomatedReplyMessage" DROP COLUMN "currentScreen",
DROP COLUMN "message",
ADD COLUMN     "currentNode" TEXT NOT NULL,
ADD COLUMN     "response" JSONB,
ADD COLUMN     "status" "WaAutomationProgressStatus" NOT NULL DEFAULT 'inProgress',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
