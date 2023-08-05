-- CreateTable
CREATE TABLE "SurveyStats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID NOT NULL,
    "visited" INTEGER NOT NULL DEFAULT 0,
    "started" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SurveyStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyStats_surveyId_key" ON "SurveyStats"("surveyId");

-- AddForeignKey
ALTER TABLE "SurveyStats" ADD CONSTRAINT "SurveyStats_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
