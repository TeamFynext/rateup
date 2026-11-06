-- AlterEnum
ALTER TYPE "PlatformType" ADD VALUE 'WEBCHAT';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "other" TEXT;
