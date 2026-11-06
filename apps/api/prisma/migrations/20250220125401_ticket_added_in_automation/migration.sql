-- AlterEnum
ALTER TYPE "TicketType" ADD VALUE 'AUTOMATION';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "waAutomatedReplyMessageId" UUID;

-- AlterTable
ALTER TABLE "WaAutomatedReply" ADD COLUMN     "enableTicket" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_waAutomatedReplyMessageId_fkey" FOREIGN KEY ("waAutomatedReplyMessageId") REFERENCES "WaAutomatedReplyMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
