-- AlterTable
ALTER TABLE "Chatbot" ADD COLUMN     "enableAllWaChat" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "aiWaChat" BOOLEAN NOT NULL DEFAULT false;
