/*
  Warnings:

  - A unique constraint covering the columns `[orgId,messageBody,platform,businessHourId]` on the table `RuleMessageBodyLock` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RulePlatform" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK');

-- DropIndex
DROP INDEX "RuleMessageBodyLock_orgId_messageBody_businessHourId_key";

-- AlterTable
ALTER TABLE "Rule" ADD COLUMN     "platform" "RulePlatform" NOT NULL DEFAULT 'WHATSAPP';

-- AlterTable
ALTER TABLE "RuleMessageBodyLock" ADD COLUMN     "platform" "RulePlatform" NOT NULL DEFAULT 'WHATSAPP';

-- CreateIndex
CREATE UNIQUE INDEX "RuleMessageBodyLock_orgId_messageBody_platform_businessHour_key" ON "RuleMessageBodyLock"("orgId", "messageBody", "platform", "businessHourId");
