/*
  Warnings:

  - Made the column `teamId` on table `Respondent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Respondent" ALTER COLUMN "teamId" SET NOT NULL;
