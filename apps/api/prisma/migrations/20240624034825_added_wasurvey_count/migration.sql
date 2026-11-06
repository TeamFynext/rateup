-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "monthlyWaSurveyResponses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "waSurveyResponsesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "waSurveysCount" INTEGER NOT NULL DEFAULT 0;
