-- DropIndex
DROP INDEX "Chatbot_orgId_key";

-- AlterTable
ALTER TABLE "Chatbot" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Default Chatbot';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "chatbotId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isAiBotActive" BOOLEAN NOT NULL DEFAULT false;
