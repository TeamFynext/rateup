/*
  Warnings:

  - You are about to drop the column `teamId` on the `Survey` table. All the data in the column will be lost.
  - You are about to drop the column `surveyId` on the `SurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `surveyId` on the `SurveyStats` table. All the data in the column will be lost.
  - You are about to drop the column `surveyId` on the `WaSession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[surveyTeamMapId]` on the table `SurveyStats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `surveyTeamMapId` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surveyTeamMapId` to the `SurveyStats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surveyTeamMapId` to the `WaCustomerGroupSurveySendHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surveyTeamMapId` to the `WaCustomerSurveySendHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surveyTeamMapId` to the `WaSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Survey" DROP CONSTRAINT "Survey_teamId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyStats" DROP CONSTRAINT "SurveyStats_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" DROP CONSTRAINT "WaCustomerGroupSurveySendHistory_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" DROP CONSTRAINT "WaCustomerSurveySendHistory_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "WaSession" DROP CONSTRAINT "WaSession_surveyId_fkey";

-- DropIndex
DROP INDEX "SurveyStats_surveyId_key";

-- AlterTable
ALTER TABLE "Survey" DROP COLUMN "teamId";

-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "surveyId",
ADD COLUMN     "surveyTeamMapId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "SurveyStats" DROP COLUMN "surveyId",
ADD COLUMN     "surveyTeamMapId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "WaCustomerGroupSurveySendHistory" ADD COLUMN     "surveyTeamMapId" UUID NOT NULL,
ALTER COLUMN "surveyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WaCustomerSurveySendHistory" ADD COLUMN     "surveyTeamMapId" UUID NOT NULL,
ALTER COLUMN "surveyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WaSession" DROP COLUMN "surveyId",
ADD COLUMN     "surveyTeamMapId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "SurveyTeamMap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "SurveyTeamMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyStats_surveyTeamMapId_key" ON "SurveyStats"("surveyTeamMapId");

-- AddForeignKey
ALTER TABLE "SurveyTeamMap" ADD CONSTRAINT "SurveyTeamMap_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyTeamMap" ADD CONSTRAINT "SurveyTeamMap_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyStats" ADD CONSTRAINT "SurveyStats_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaSession" ADD CONSTRAINT "WaSession_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" ADD CONSTRAINT "WaCustomerSurveySendHistory_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerSurveySendHistory" ADD CONSTRAINT "WaCustomerSurveySendHistory_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" ADD CONSTRAINT "WaCustomerGroupSurveySendHistory_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCustomerGroupSurveySendHistory" ADD CONSTRAINT "WaCustomerGroupSurveySendHistory_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
