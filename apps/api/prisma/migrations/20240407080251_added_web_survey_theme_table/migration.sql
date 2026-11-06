-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "webSurveyThemeId" UUID;

-- CreateTable
CREATE TABLE "WebSurveyTheme" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "theme" JSONB NOT NULL,

    CONSTRAINT "WebSurveyTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebSurveyTheme_orgId_name_key" ON "WebSurveyTheme"("orgId", "name");

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_webSurveyThemeId_fkey" FOREIGN KEY ("webSurveyThemeId") REFERENCES "WebSurveyTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSurveyTheme" ADD CONSTRAINT "WebSurveyTheme_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
