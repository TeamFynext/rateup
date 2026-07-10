-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "dailySendLimit" INTEGER;

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "updatedAt" DROP DEFAULT;
