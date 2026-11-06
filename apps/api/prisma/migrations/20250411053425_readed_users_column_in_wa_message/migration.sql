-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "readUsers" TEXT[] DEFAULT ARRAY[]::TEXT[];
