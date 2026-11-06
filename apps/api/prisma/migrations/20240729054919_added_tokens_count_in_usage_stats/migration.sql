-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "aiCompletionTokensCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiPromptTokensCount" INTEGER NOT NULL DEFAULT 0;
