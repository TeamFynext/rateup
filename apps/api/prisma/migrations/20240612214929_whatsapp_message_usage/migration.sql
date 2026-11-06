-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "allowedMessagesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messagesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyMessagesCount" INTEGER NOT NULL DEFAULT 0;
