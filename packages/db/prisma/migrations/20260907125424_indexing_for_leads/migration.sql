-- CreateIndex
CREATE INDEX "Lead_stageId_stageEnteredAt_id_idx" ON "Lead"("stageId", "stageEnteredAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Lead_pipelineId_stageEnteredAt_id_idx" ON "Lead"("pipelineId", "stageEnteredAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Lead_pipelineId_lastActivityAt_idx" ON "Lead"("pipelineId", "lastActivityAt");
