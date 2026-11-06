-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "conversationId" UUID;

-- CreateTable
CREATE TABLE "ConversationAssignedUserTeamMap" (
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "lastAssignedAt" TIMESTAMP(3),
    "lastRemovedAt" TIMESTAMP(3),
    "lastRemovedBy" UUID,
    "lastAssignedBy" UUID,
    "isAssignedByAutomation" BOOLEAN NOT NULL DEFAULT false,
    "actionHistory" JSONB[] DEFAULT ARRAY[]::JSONB[],

    CONSTRAINT "ConversationAssignedUserTeamMap_pkey" PRIMARY KEY ("userId","conversationId")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contactId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "firstRespondedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAssignedUserTeamMap" ADD CONSTRAINT "ConversationAssignedUserTeamMap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAssignedUserTeamMap" ADD CONSTRAINT "ConversationAssignedUserTeamMap_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAssignedUserTeamMap" ADD CONSTRAINT "ConversationAssignedUserTeamMap_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAssignedUserTeamMap" ADD CONSTRAINT "ConversationAssignedUserTeamMap_lastRemovedBy_fkey" FOREIGN KEY ("lastRemovedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAssignedUserTeamMap" ADD CONSTRAINT "ConversationAssignedUserTeamMap_lastAssignedBy_fkey" FOREIGN KEY ("lastAssignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
