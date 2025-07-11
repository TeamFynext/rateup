-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "annualTemplateMessageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyTemplateMessageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "templateMessagesCount" INTEGER NOT NULL DEFAULT 0;
