-- AlterTable
ALTER TABLE "MenuBanner" ADD COLUMN     "foodLabels" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "foodLabels" TEXT[] DEFAULT ARRAY[]::TEXT[];
