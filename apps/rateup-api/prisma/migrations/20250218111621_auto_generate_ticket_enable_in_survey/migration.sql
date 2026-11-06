-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "enableAutoGenerateTicket" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableTicketWaMessageAlerts" BOOLEAN NOT NULL DEFAULT false;
