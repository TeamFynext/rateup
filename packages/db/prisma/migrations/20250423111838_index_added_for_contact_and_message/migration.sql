-- CreateIndex
CREATE INDEX "Contact_orgId_id_idx" ON "Contact"("orgId", "id");

-- CreateIndex
CREATE INDEX "Contact_orgId_waMessageAssignStatus_idx" ON "Contact"("orgId", "waMessageAssignStatus");

-- CreateIndex
CREATE INDEX "Contact_lastReceivedMessageTimeStamp_idx" ON "Contact"("lastReceivedMessageTimeStamp");

-- CreateIndex
CREATE INDEX "WaInboxAssign_contactId_assignedUserId_idx" ON "WaInboxAssign"("contactId", "assignedUserId");

-- CreateIndex
CREATE INDEX "WaMessage_contactId_idx" ON "WaMessage"("contactId");
