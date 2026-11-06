/*
  Warnings:

  - You are about to drop the `LoyaltyTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LoyaltyTemplate" DROP CONSTRAINT "LoyaltyTemplate_orgId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTemplate" DROP CONSTRAINT "LoyaltyTemplate_waTemplateId_fkey";

-- DropTable
DROP TABLE "LoyaltyTemplate";

-- CreateTable
CREATE TABLE "LoyaltyWaCommand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "waTemplateId" UUID,
    "requestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB,
    "responseType" TEXT NOT NULL DEFAULT 'Template',
    "actionId" UUID,

    CONSTRAINT "LoyaltyWaCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyWaCommand_actionId_key" ON "LoyaltyWaCommand"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyWaCommand_requestMessage_orgId_key" ON "LoyaltyWaCommand"("requestMessage", "orgId");

-- AddForeignKey
ALTER TABLE "LoyaltyWaCommand" ADD CONSTRAINT "LoyaltyWaCommand_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyWaCommand" ADD CONSTRAINT "LoyaltyWaCommand_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyWaCommand" ADD CONSTRAINT "LoyaltyWaCommand_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "LoyaltyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
