-- CreateTable
CREATE TABLE "SurveyVariables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "surveyId" UUID NOT NULL,

    CONSTRAINT "SurveyVariables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyVariables_name_surveyId_key" ON "SurveyVariables"("name", "surveyId");

-- AddForeignKey
ALTER TABLE "SurveyVariables" ADD CONSTRAINT "SurveyVariables_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
