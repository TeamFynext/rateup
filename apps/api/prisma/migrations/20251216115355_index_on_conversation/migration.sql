-- CreateIndex
CREATE INDEX "Conversation_contactId_idx" ON "Conversation"("contactId");

-- CreateIndex
CREATE INDEX "Conversation_firstRespondedAt_idx" ON "Conversation"("firstRespondedAt");

-- CreateIndex
CREATE INDEX "Conversation_createdAt_idx" ON "Conversation"("createdAt");

-- CreateIndex
CREATE INDEX "ConversationAssignedUserTeamMap_userId_conversationId_idx" ON "ConversationAssignedUserTeamMap"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "ConversationAssignedUserTeamMap_conversationId_idx" ON "ConversationAssignedUserTeamMap"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationAssignedUserTeamMap_userId_lastAssignedAt_lastR_idx" ON "ConversationAssignedUserTeamMap"("userId", "lastAssignedAt", "lastRemovedAt");

-- CreateIndex
CREATE INDEX "WaMessage_sendBy_waCreatedAt_idx" ON "WaMessage"("sendBy", "waCreatedAt");

-- CreateIndex
CREATE INDEX "WaMessage_conversationId_idx" ON "WaMessage"("conversationId");
