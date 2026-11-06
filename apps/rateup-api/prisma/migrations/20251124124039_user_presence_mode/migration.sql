-- CreateEnum
CREATE TYPE "UserPresenceMode" AS ENUM ('automatic', 'manual');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "presenceMode" "UserPresenceMode" NOT NULL DEFAULT 'automatic';
