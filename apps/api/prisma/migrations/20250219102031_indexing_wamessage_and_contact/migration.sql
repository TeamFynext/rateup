-- CreateIndex
CREATE INDEX "CampaignParticipant_contactId_idx" ON "CampaignParticipant"("contactId");

-- CreateIndex
CREATE INDEX "Contact_orgId_idx" ON "Contact"("orgId");

-- CreateIndex
CREATE INDEX "ContactGroupMap_contactId_idx" ON "ContactGroupMap"("contactId");

-- CreateIndex
CREATE INDEX "WaMessage_contactId_waCreatedAt_idx" ON "WaMessage"("contactId", "waCreatedAt" DESC);

-- Index for filtering messages where exchangeProcess = 'receive'
CREATE INDEX idx_wa_message_contactId_exchangeProcess ON "WaMessage" ("contactId", (("messageBody"->>'exchangeProcess')));