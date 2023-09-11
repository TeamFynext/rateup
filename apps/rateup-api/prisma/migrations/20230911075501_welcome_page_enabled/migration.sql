-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "welcomePageEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SurveyLanding" ADD COLUMN     "welcomePageEnabled" BOOLEAN NOT NULL DEFAULT false;
