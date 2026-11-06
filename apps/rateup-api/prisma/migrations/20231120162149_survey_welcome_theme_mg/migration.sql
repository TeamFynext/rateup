/*
  Warnings:

  - A unique constraint covering the columns `[surveyId]` on the table `WelcomeTheme` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WelcomeTheme" ADD COLUMN     "mobileBgUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeTheme_surveyId_key" ON "WelcomeTheme"("surveyId");

-- AddForeignKey
ALTER TABLE "WelcomeTheme" ADD CONSTRAINT "WelcomeTheme_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
