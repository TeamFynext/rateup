-- AlterTable
ALTER TABLE "MetaBusinessAgent" ADD COLUMN     "budgets" JSONB,
ADD COLUMN     "budgetsSyncedAt" TIMESTAMP(3),
ADD COLUMN     "businessManagerId" TEXT,
ADD COLUMN     "handoffMessageSelection" TEXT,
ADD COLUMN     "rateupToolsKeyHash" TEXT;

-- AlterTable
ALTER TABLE "MetaAgentConnector" ADD COLUMN     "builtIn" TEXT;

-- AlterTable
ALTER TABLE "MetaAgentSkill" ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "MetaAgentWebsite" ADD COLUMN     "crawlError" TEXT;
