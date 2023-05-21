/*
  Warnings:

  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_surveyId_fkey";

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "questions" JSONB[] DEFAULT ARRAY[]::JSONB[];

-- DropTable
DROP TABLE "Question";
