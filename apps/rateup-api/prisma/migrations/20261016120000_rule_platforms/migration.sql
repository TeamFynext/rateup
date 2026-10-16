-- A rule can run on several channels: `platforms` lists them, and a keyword is locked once per
-- channel instead of once per condition.

-- DropIndex
DROP INDEX "RuleMessageBodyLock_ruleConditionId_key";

-- AlterTable
ALTER TABLE "Rule" ADD COLUMN     "platforms" "RulePlatform"[] DEFAULT ARRAY[]::"RulePlatform"[];

-- Every existing rule runs on the one platform it was built for.
UPDATE "Rule" SET "platforms" = ARRAY["platform"];

-- CreateIndex
CREATE UNIQUE INDEX "RuleMessageBodyLock_ruleConditionId_platform_key" ON "RuleMessageBodyLock"("ruleConditionId", "platform");
