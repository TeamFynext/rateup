-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "labels" TEXT[];

-- AlterTable
ALTER TABLE "WaAccountSettings" ADD COLUMN     "inboxLabels" JSONB;
