-- AlterTable
ALTER TABLE "TicketCard" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "checklists" JSONB;
