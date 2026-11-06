-- CreateEnum
CREATE TYPE "WaMessageOrgTeamType" AS ENUM ('TEMPLATE', 'CAMPAIGN', 'INBOX', 'FLOW', 'AUTOMATED');

-- CreateTable
CREATE TABLE "WaMessageOrgTeamMap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" UUID,
    "messageId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "isAutomedMessage" BOOLEAN NOT NULL DEFAULT false,
    "type" "WaMessageOrgTeamType" NOT NULL,
    "externalApi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WaMessageOrgTeamMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaMessageOrgTeamMap_orgId_idx" ON "WaMessageOrgTeamMap"("orgId");

-- CreateIndex
CREATE INDEX "WaMessageOrgTeamMap_teamId_idx" ON "WaMessageOrgTeamMap"("teamId");

-- CreateIndex
CREATE INDEX "WaMessageOrgTeamMap_type_idx" ON "WaMessageOrgTeamMap"("type");

-- CreateIndex
CREATE INDEX "WaMessageOrgTeamMap_externalApi_idx" ON "WaMessageOrgTeamMap"("externalApi");

-- AddForeignKey
ALTER TABLE "WaMessageOrgTeamMap" ADD CONSTRAINT "WaMessageOrgTeamMap_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessageOrgTeamMap" ADD CONSTRAINT "WaMessageOrgTeamMap_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WaMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessageOrgTeamMap" ADD CONSTRAINT "WaMessageOrgTeamMap_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
