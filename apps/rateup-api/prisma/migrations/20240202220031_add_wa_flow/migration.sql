-- DropForeignKey
ALTER TABLE "WaSession" DROP CONSTRAINT "WaSession_surveyTeamMapId_fkey";

-- AlterTable
ALTER TABLE "WaSession" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'survey',
ALTER COLUMN "surveyTeamMapId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WaFlow" (
    "dbFlowId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flowId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "preview" JSONB,
    "map" JSONB NOT NULL,
    "orgId" UUID NOT NULL,
    "surveyId" UUID NOT NULL,

    CONSTRAINT "WaFlow_pkey" PRIMARY KEY ("dbFlowId")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaFlow_flowId_key" ON "WaFlow"("flowId");

-- CreateIndex
CREATE UNIQUE INDEX "WaFlow_surveyId_key" ON "WaFlow"("surveyId");

-- AddForeignKey
ALTER TABLE "WaSession" ADD CONSTRAINT "WaSession_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaFlow" ADD CONSTRAINT "WaFlow_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaFlow" ADD CONSTRAINT "WaFlow_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
