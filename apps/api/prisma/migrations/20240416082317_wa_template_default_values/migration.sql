-- AlterTable
ALTER TABLE "WaTemplate" ADD COLUMN     "defaultValues" JSONB,
ALTER COLUMN "acceptButton" DROP NOT NULL;
