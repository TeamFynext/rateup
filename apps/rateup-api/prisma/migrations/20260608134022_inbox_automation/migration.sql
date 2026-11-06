-- CreateEnum
CREATE TYPE "InboxAutomationAction" AS ENUM ('CLOSE');

-- CreateEnum
CREATE TYPE "InboxAutomationCondition" AS ENUM ('UNASSIGNED', 'NEW', 'ASSIGNED');

-- CreateTable
CREATE TABLE "InboxAutomation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeAfterHours" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "action" "InboxAutomationAction",
    "condition" "InboxAutomationCondition",
    "orgId" UUID NOT NULL,

    CONSTRAINT "InboxAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboxAutomation_orgId_condition_key" ON "InboxAutomation"("orgId", "condition");

-- AddForeignKey
ALTER TABLE "InboxAutomation" ADD CONSTRAINT "InboxAutomation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
