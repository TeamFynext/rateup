/*
  Warnings:

  - You are about to drop the column `other` on the `WaAutomatedReply` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `WaAutomatedReply` table. All the data in the column will be lost.
  - You are about to drop the `WaAutomatedReplyAssignedUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WaAutomatedReply" DROP CONSTRAINT "WaAutomatedReply_teamId_fkey";

-- DropForeignKey
ALTER TABLE "WaAutomatedReplyAssignedUser" DROP CONSTRAINT "WaAutomatedReplyAssignedUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "WaAutomatedReplyAssignedUser" DROP CONSTRAINT "WaAutomatedReplyAssignedUser_waAutomatedReplyId_fkey";

-- AlterTable
ALTER TABLE "WaAutomatedReply" DROP COLUMN "other",
DROP COLUMN "teamId";

-- DropTable
DROP TABLE "WaAutomatedReplyAssignedUser";
