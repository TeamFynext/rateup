/*
  Warnings:

  - A unique constraint covering the columns `[command,orgId,businessHourId]` on the table `WaAutomatedReplyCommands` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."WaAutomatedReplyCommands_command_orgId_key";

-- AlterTable
ALTER TABLE "public"."WaAutomatedReplyCommands" ADD COLUMN     "businessHourId" UUID;

-- CreateTable
CREATE TABLE "public"."BusinessHour" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "channels" TEXT[],
    "description" TEXT,
    "schedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaAutomatedReplyCommands_command_orgId_businessHourId_key" ON "public"."WaAutomatedReplyCommands"("command", "orgId", "businessHourId");

-- AddForeignKey
ALTER TABLE "public"."WaAutomatedReplyCommands" ADD CONSTRAINT "WaAutomatedReplyCommands_businessHourId_fkey" FOREIGN KEY ("businessHourId") REFERENCES "public"."BusinessHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessHour" ADD CONSTRAINT "BusinessHour_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
