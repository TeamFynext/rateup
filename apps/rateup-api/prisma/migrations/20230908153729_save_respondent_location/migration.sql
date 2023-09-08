-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "getLocation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SurveyResponse" ADD COLUMN     "locationCoordinates" JSONB;
