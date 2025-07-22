-- AlterTable
ALTER TABLE "WaAccountSettings" ADD COLUMN     "contactGroupTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
