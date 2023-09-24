/*
  Warnings:

  - Added the required column `templateId` to the `RGroupSurveySendHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `RespondentSurveySendHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `WaSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RGroupSurveySendHistory" ADD COLUMN     "templateId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "RespondentSurveySendHistory" ADD COLUMN     "templateId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "WaSession" ADD COLUMN     "templateId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "WaTemplate" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "acceptButton" TEXT NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "WaTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WaSession" ADD CONSTRAINT "WaSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespondentSurveySendHistory" ADD CONSTRAINT "RespondentSurveySendHistory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RGroupSurveySendHistory" ADD CONSTRAINT "RGroupSurveySendHistory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaTemplate" ADD CONSTRAINT "WaTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
