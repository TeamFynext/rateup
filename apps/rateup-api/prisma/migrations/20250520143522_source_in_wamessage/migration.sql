-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('WHATSAPP', 'INSTAGRAM');

-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "sourceIdentifier" TEXT,
ADD COLUMN     "sourcePlatform" "PlatformType";
