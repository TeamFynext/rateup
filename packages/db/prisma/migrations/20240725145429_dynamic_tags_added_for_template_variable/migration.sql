-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "dynamicTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
