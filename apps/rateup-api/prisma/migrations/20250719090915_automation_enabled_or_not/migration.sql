-- AlterTable
ALTER TABLE "ContactGroup" ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "WaAutomatedReply" ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true;
