/*
  Warnings:

  - You are about to drop the column `ticketAssignNotification` on the `NotificationSetting` table. All the data in the column will be lost.
  - You are about to drop the column `enableAutoGenerateTicket` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `enableTicketEmailAlerts` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `enableTicketWaMessageAlerts` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `enableTickets` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `ticketBoardId` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `ticketColumnId` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketBoard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketBoardLabel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketBoardNotification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketBoardTeam` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketCard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketCardAssignee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketColumn` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketLabelMap` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_reviewId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_surveyResponseId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_waAutomatedReplyMessageId_fkey";

-- DropForeignKey
ALTER TABLE "TicketActivity" DROP CONSTRAINT "TicketActivity_ticketCardId_fkey";

-- DropForeignKey
ALTER TABLE "TicketActivity" DROP CONSTRAINT "TicketActivity_userId_fkey";

-- DropForeignKey
ALTER TABLE "TicketBoardLabel" DROP CONSTRAINT "TicketBoardLabel_ticketBoardId_fkey";

-- DropForeignKey
ALTER TABLE "TicketBoardNotification" DROP CONSTRAINT "TicketBoardNotification_ticketBoardId_fkey";

-- DropForeignKey
ALTER TABLE "TicketBoardNotification" DROP CONSTRAINT "TicketBoardNotification_userId_fkey";

-- DropForeignKey
ALTER TABLE "TicketBoardTeam" DROP CONSTRAINT "TicketBoardTeam_boardId_fkey";

-- DropForeignKey
ALTER TABLE "TicketBoardTeam" DROP CONSTRAINT "TicketBoardTeam_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCard" DROP CONSTRAINT "TicketCard_contactId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCard" DROP CONSTRAINT "TicketCard_reviewId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCard" DROP CONSTRAINT "TicketCard_surveyResponseId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCard" DROP CONSTRAINT "TicketCard_ticketColumnId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCard" DROP CONSTRAINT "TicketCard_waAutomatedReplyMessageId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCardAssignee" DROP CONSTRAINT "TicketCardAssignee_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCardAssignee" DROP CONSTRAINT "TicketCardAssignee_cardId_fkey";

-- DropForeignKey
ALTER TABLE "TicketColumn" DROP CONSTRAINT "TicketColumn_ticketBoardId_fkey";

-- DropForeignKey
ALTER TABLE "TicketComment" DROP CONSTRAINT "TicketComment_createdById_fkey";

-- DropForeignKey
ALTER TABLE "TicketComment" DROP CONSTRAINT "TicketComment_ticketCardId_fkey";

-- DropForeignKey
ALTER TABLE "TicketLabelMap" DROP CONSTRAINT "TicketLabelMap_cardId_fkey";

-- DropForeignKey
ALTER TABLE "TicketLabelMap" DROP CONSTRAINT "TicketLabelMap_labelId_fkey";

-- AlterTable
ALTER TABLE "NotificationSetting" DROP COLUMN "ticketAssignNotification";

-- AlterTable
ALTER TABLE "Survey" DROP COLUMN "enableAutoGenerateTicket",
DROP COLUMN "enableTicketEmailAlerts",
DROP COLUMN "enableTicketWaMessageAlerts",
DROP COLUMN "enableTickets",
DROP COLUMN "ticketBoardId",
DROP COLUMN "ticketColumnId";

-- DropTable
DROP TABLE "Ticket";

-- DropTable
DROP TABLE "TicketActivity";

-- DropTable
DROP TABLE "TicketBoard";

-- DropTable
DROP TABLE "TicketBoardLabel";

-- DropTable
DROP TABLE "TicketBoardNotification";

-- DropTable
DROP TABLE "TicketBoardTeam";

-- DropTable
DROP TABLE "TicketCard";

-- DropTable
DROP TABLE "TicketCardAssignee";

-- DropTable
DROP TABLE "TicketColumn";

-- DropTable
DROP TABLE "TicketComment";

-- DropTable
DROP TABLE "TicketLabelMap";

-- DropEnum
DROP TYPE "TicketPriority";

-- DropEnum
DROP TYPE "TicketStatus";

-- DropEnum
DROP TYPE "TicketType";
