-- AlterEnum
ALTER TYPE "TicketType" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "enableTicketEmailAlerts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableTickets" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "description" TEXT;
