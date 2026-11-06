/*
  Warnings:

  - You are about to drop the column `teamId` on the `TicketBoard` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToId` on the `TicketCard` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TicketBoard" DROP CONSTRAINT "TicketBoard_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TicketCard" DROP CONSTRAINT "TicketCard_assignedToId_fkey";

-- AlterTable
ALTER TABLE "TicketBoard" DROP COLUMN "teamId";

-- AlterTable
ALTER TABLE "TicketCard" DROP COLUMN "assignedToId";

-- CreateTable
CREATE TABLE "TicketBoardTeam" (
    "boardId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketBoardTeam_pkey" PRIMARY KEY ("boardId","teamId")
);

-- CreateTable
CREATE TABLE "TicketCardAssignee" (
    "cardId" UUID NOT NULL,
    "assigneeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketCardAssignee_pkey" PRIMARY KEY ("cardId","assigneeId")
);

-- AddForeignKey
ALTER TABLE "TicketBoardTeam" ADD CONSTRAINT "TicketBoardTeam_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "TicketBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketBoardTeam" ADD CONSTRAINT "TicketBoardTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCardAssignee" ADD CONSTRAINT "TicketCardAssignee_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "TicketCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCardAssignee" ADD CONSTRAINT "TicketCardAssignee_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
