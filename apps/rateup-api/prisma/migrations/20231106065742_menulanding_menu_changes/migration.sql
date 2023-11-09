-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MenuLanding" ADD COLUMN     "mobileBackgroundImage" TEXT,
ADD COLUMN     "surveyId" UUID;

-- AddForeignKey
ALTER TABLE "MenuLanding" ADD CONSTRAINT "MenuLanding_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
