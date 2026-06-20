-- AlterTable
ALTER TABLE "TicketBoard" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "TicketCard" ADD COLUMN     "contactId" UUID;

-- AddForeignKey
ALTER TABLE "TicketCard" ADD CONSTRAINT "TicketCard_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
