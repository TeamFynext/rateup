-- CreateTable
CREATE TABLE "WaMessageSchedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "messageBody" JSONB NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "messageId" TEXT,
    "waTemplateId" UUID,
    "orgId" UUID NOT NULL,
    "surveyTeamMapId" UUID,

    CONSTRAINT "WaMessageSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WaMessageSchedule" ADD CONSTRAINT "WaMessageSchedule_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessageSchedule" ADD CONSTRAINT "WaMessageSchedule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessageSchedule" ADD CONSTRAINT "WaMessageSchedule_surveyTeamMapId_fkey" FOREIGN KEY ("surveyTeamMapId") REFERENCES "SurveyTeamMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
