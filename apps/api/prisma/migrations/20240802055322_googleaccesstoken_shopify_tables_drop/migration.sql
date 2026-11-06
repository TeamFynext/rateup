/*
  Warnings:

  - You are about to drop the column `driveFolderId` on the `Org` table. All the data in the column will be lost.
  - You are about to drop the `GoogleAccessToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopifySession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopifySurvey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopifySurveySchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GoogleAccessToken" DROP CONSTRAINT "GoogleAccessToken_orgId_fkey";

-- DropForeignKey
ALTER TABLE "ShopifySession" DROP CONSTRAINT "ShopifySession_orgId_fkey";

-- DropForeignKey
ALTER TABLE "ShopifySurvey" DROP CONSTRAINT "ShopifySurvey_orgId_fkey";

-- DropForeignKey
ALTER TABLE "ShopifySurvey" DROP CONSTRAINT "ShopifySurvey_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "ShopifySurvey" DROP CONSTRAINT "ShopifySurvey_teamId_fkey";

-- DropForeignKey
ALTER TABLE "ShopifySurvey" DROP CONSTRAINT "ShopifySurvey_waTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "ShopifySurveySchedule" DROP CONSTRAINT "ShopifySurveySchedule_shopifySurveyId_fkey";

-- AlterTable
ALTER TABLE "Org" DROP COLUMN "driveFolderId";

-- DropTable
DROP TABLE "GoogleAccessToken";

-- DropTable
DROP TABLE "ShopifySession";

-- DropTable
DROP TABLE "ShopifySurvey";

-- DropTable
DROP TABLE "ShopifySurveySchedule";
