-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "isTellUsMoreCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tellUsMore" JSONB;
