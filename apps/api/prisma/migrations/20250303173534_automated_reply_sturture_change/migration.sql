/*
  Warnings:

  - You are about to drop the column `responseTemplateId` on the `WaAutomatedReply` table. All the data in the column will be lost.
  - You are about to drop the column `responseText` on the `WaAutomatedReply` table. All the data in the column will be lost.
  - You are about to drop the column `responseType` on the `WaAutomatedReply` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WaAutomatedReply" DROP COLUMN "responseTemplateId",
DROP COLUMN "responseText",
DROP COLUMN "responseType",
ADD COLUMN     "orgId" UUID;

-- CreateTable
CREATE TABLE "WaAutomatedReplyCommands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "command" TEXT NOT NULL,
    "orgId" UUID NOT NULL,
    "waAutomatedReplyId" UUID,

    CONSTRAINT "WaAutomatedReplyCommands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaAutomatedReplyCommands_command_orgId_key" ON "WaAutomatedReplyCommands"("command", "orgId");

-- AddForeignKey
ALTER TABLE "WaAutomatedReply" ADD CONSTRAINT "WaAutomatedReply_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaAutomatedReplyCommands" ADD CONSTRAINT "WaAutomatedReplyCommands_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaAutomatedReplyCommands" ADD CONSTRAINT "WaAutomatedReplyCommands_waAutomatedReplyId_fkey" FOREIGN KEY ("waAutomatedReplyId") REFERENCES "WaAutomatedReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
