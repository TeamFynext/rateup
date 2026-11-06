-- CreateEnum
CREATE TYPE "RuleOperator" AS ENUM ('AND', 'OR');

-- CreateEnum
CREATE TYPE "ConditionField" AS ENUM ('MESSAGE_BODY', 'CONTACT_EMAIL', 'BUSINESS_HOURS', 'CONTACT_GROUP', 'CONTACT_LABEL', 'CONTACT_LIFECYCLE', 'SEND_ONCE_PER_24H');

-- CreateEnum
CREATE TYPE "ConditionOperator" AS ENUM ('CONTAINS', 'EQUALS', 'STARTS_WITH', 'ENDS_WITH');

-- CreateEnum
CREATE TYPE "TriggerEvent" AS ENUM ('MESSAGE_RECEIVED', 'CHAT_CLOSED', 'CHAT_ASSIGNED', 'CONTACT_CREATED', 'LIFECYCLE_UPDATED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CLOSE_TICKET', 'ATTACH_LABEL', 'ASSIGN_USER', 'ASSIGN_TEAM', 'ASSIGN_LIFECYCLE', 'SEND_MESSAGE', 'SEND_TEMPLATE', 'SEND_FLOW', 'TRIGGER_CHATBOT');

-- CreateTable
CREATE TABLE "Rule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "operator" "RuleOperator" NOT NULL DEFAULT 'AND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerEvent" "TriggerEvent" NOT NULL,
    "whatsappSettingsPhoneIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whatsappSettingsId" UUID,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleConditionGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruleId" UUID NOT NULL,
    "operator" "RuleOperator" NOT NULL DEFAULT 'AND',

    CONSTRAINT "RuleConditionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleCondition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" UUID NOT NULL,
    "field" "ConditionField" NOT NULL,
    "operator" "ConditionOperator" NOT NULL,
    "value" TEXT,

    CONSTRAINT "RuleCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleAction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruleId" UUID NOT NULL,
    "type" "ActionType" NOT NULL,
    "value" JSONB,

    CONSTRAINT "RuleAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleMessageBodyLock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageBody" TEXT NOT NULL,
    "businessHourId" UUID,
    "orgId" UUID NOT NULL,
    "ruleConditionId" UUID NOT NULL,

    CONSTRAINT "RuleMessageBodyLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rule_name_orgId_key" ON "Rule"("name", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleMessageBodyLock_ruleConditionId_key" ON "RuleMessageBodyLock"("ruleConditionId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleMessageBodyLock_orgId_messageBody_businessHourId_key" ON "RuleMessageBodyLock"("orgId", "messageBody", "businessHourId");

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_whatsappSettingsId_fkey" FOREIGN KEY ("whatsappSettingsId") REFERENCES "WhatsappSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleConditionGroup" ADD CONSTRAINT "RuleConditionGroup_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleCondition" ADD CONSTRAINT "RuleCondition_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RuleConditionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleAction" ADD CONSTRAINT "RuleAction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleMessageBodyLock" ADD CONSTRAINT "RuleMessageBodyLock_businessHourId_fkey" FOREIGN KEY ("businessHourId") REFERENCES "BusinessHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleMessageBodyLock" ADD CONSTRAINT "RuleMessageBodyLock_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleMessageBodyLock" ADD CONSTRAINT "RuleMessageBodyLock_ruleConditionId_fkey" FOREIGN KEY ("ruleConditionId") REFERENCES "RuleCondition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
