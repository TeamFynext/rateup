-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "surveyId" UUID NOT NULL,
    "responses" JSONB[],
    "language" TEXT NOT NULL,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
