-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "hiddenModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "modulesChosenAt" TIMESTAMP(3);
