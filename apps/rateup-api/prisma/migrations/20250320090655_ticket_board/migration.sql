/*
  Warnings:

  - You are about to drop the column `ticketId` on the `TicketComment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TicketComment" DROP CONSTRAINT "TicketComment_ticketId_fkey";

-- AlterTable
ALTER TABLE "TicketComment" DROP COLUMN "ticketId",
ADD COLUMN     "ticketCardId" UUID;

-- CreateTable
CREATE TABLE "TicketBoard" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "TicketBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketColumn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "ticketBoardId" UUID NOT NULL,

    CONSTRAINT "TicketColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCard" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ticketId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "priority" "TicketPriority",
    "type" "TicketType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToId" UUID,
    "ticketColumnId" UUID NOT NULL,
    "reviewId" UUID,
    "surveyResponseId" UUID,
    "waAutomatedReplyMessageId" UUID,

    CONSTRAINT "TicketCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,
    "ticketCardId" UUID NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketCard_ticketId_key" ON "TicketCard"("ticketId");

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketCardId_fkey" FOREIGN KEY ("ticketCardId") REFERENCES "TicketCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketBoard" ADD CONSTRAINT "TicketBoard_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketColumn" ADD CONSTRAINT "TicketColumn_ticketBoardId_fkey" FOREIGN KEY ("ticketBoardId") REFERENCES "TicketBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCard" ADD CONSTRAINT "TicketCard_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCard" ADD CONSTRAINT "TicketCard_ticketColumnId_fkey" FOREIGN KEY ("ticketColumnId") REFERENCES "TicketColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCard" ADD CONSTRAINT "TicketCard_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCard" ADD CONSTRAINT "TicketCard_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCard" ADD CONSTRAINT "TicketCard_waAutomatedReplyMessageId_fkey" FOREIGN KEY ("waAutomatedReplyMessageId") REFERENCES "WaAutomatedReplyMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketCardId_fkey" FOREIGN KEY ("ticketCardId") REFERENCES "TicketCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
