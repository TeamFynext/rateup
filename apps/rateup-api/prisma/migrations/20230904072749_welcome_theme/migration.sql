-- CreateTable
CREATE TABLE "WelcomeTheme" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "landingId" UUID,
    "surveyId" UUID,
    "headerText" TEXT NOT NULL DEFAULT '',
    "descText" TEXT NOT NULL DEFAULT '',
    "buttonText" TEXT NOT NULL DEFAULT '',
    "headerStyles" JSONB NOT NULL,
    "descStyles" JSONB NOT NULL,
    "buttonStyles" JSONB NOT NULL,
    "bgStyles" JSONB NOT NULL,
    "logoStyles" JSONB NOT NULL,
    "logoUrl" TEXT,
    "bgUrl" TEXT,
    "bgType" TEXT DEFAULT 'bgcolor',

    CONSTRAINT "WelcomeTheme_pkey" PRIMARY KEY ("id")
);
