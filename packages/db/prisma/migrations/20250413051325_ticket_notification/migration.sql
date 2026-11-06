-- AlterTable
ALTER TABLE "TicketBoard" ADD COLUMN     "ticketAssignedEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ticketAssignedWhatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ticketCreatedEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ticketCreatedWhatsapp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TicketBoardNotification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticketBoardId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "TicketBoardNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketBoardNotification_ticketBoardId_userId_key" ON "TicketBoardNotification"("ticketBoardId", "userId");

-- AddForeignKey
ALTER TABLE "TicketBoardNotification" ADD CONSTRAINT "TicketBoardNotification_ticketBoardId_fkey" FOREIGN KEY ("ticketBoardId") REFERENCES "TicketBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketBoardNotification" ADD CONSTRAINT "TicketBoardNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
