/*
  Warnings:

  - You are about to drop the `WelcomeTheme` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WelcomeTheme" DROP CONSTRAINT "WelcomeTheme_surveyId_fkey";

-- DropTable
DROP TABLE "WelcomeTheme";
