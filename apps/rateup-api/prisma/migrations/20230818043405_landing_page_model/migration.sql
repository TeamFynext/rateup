-- CreateTable
CREATE TABLE "SurveyLanding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "surveys" TEXT[],
    "createdBy" UUID NOT NULL,

    CONSTRAINT "SurveyLanding_pkey" PRIMARY KEY ("id")
);
