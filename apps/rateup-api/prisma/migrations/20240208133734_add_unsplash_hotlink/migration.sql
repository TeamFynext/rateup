-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "unsplashImage" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "MenuLanding" ADD COLUMN     "unsplashImage" JSONB;
