/*
  Warnings:

  - You are about to drop the column `currentNode` on the `WaAutomatedReplyMessage` table. All the data in the column will be lost.
  - You are about to drop the column `response` on the `WaAutomatedReplyMessage` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `WaAutomatedReplyMessage` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `WaAutomatedReplyMessage` table. All the data in the column will be lost.
  - Added the required column `currentScreen` to the `WaAutomatedReplyMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `WaAutomatedReplyMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WaAutomatedReplyMessage" DROP COLUMN "currentNode",
DROP COLUMN "response",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "currentScreen" TEXT NOT NULL,
ADD COLUMN     "message" TEXT NOT NULL;

-- DropEnum
DROP TYPE "WaAutomationProgressStatus";
