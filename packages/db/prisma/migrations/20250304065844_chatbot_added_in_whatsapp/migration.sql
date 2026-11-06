-- AlterTable
ALTER TABLE "Chatbot" ADD COLUMN     "enableWaChat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waCommand" TEXT;
