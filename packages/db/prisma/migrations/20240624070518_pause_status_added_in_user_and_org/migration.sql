-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "isPaused" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPaused" BOOLEAN DEFAULT false,
ADD COLUMN     "pausedBy" TEXT;
