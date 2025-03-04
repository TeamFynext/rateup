/*
  Warnings:

  - You are about to drop the column `teamId` on the `WaAutomatedReply` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "WaAutomatedReply" DROP CONSTRAINT "WaAutomatedReply_teamId_fkey";

-- AlterTable
ALTER TABLE "WaAutomatedReply" DROP COLUMN "teamId";
