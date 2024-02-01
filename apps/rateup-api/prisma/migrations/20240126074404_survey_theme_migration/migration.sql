-- CreateTable
CREATE TABLE "SurveyTheme" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "surveyId" UUID NOT NULL,
    "welcomeTheme" JSONB NOT NULL,
    "surveyTheme" JSONB NOT NULL,
    "thankyouTheme" JSONB NOT NULL,

    CONSTRAINT "SurveyTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyTheme_surveyId_key" ON "SurveyTheme"("surveyId");

-- AddForeignKey
ALTER TABLE "SurveyTheme" ADD CONSTRAINT "SurveyTheme_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
