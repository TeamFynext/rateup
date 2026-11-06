-- CreateTable
CREATE TABLE "ConversationTag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3b82f6',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" UUID NOT NULL,

    CONSTRAINT "ConversationTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationTagMap" (
    "conversationId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTagMap_pkey" PRIMARY KEY ("conversationId","tagId")
);

-- CreateIndex
CREATE INDEX "ConversationTag_orgId_idx" ON "ConversationTag"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTag_name_orgId_key" ON "ConversationTag"("name", "orgId");

-- CreateIndex
CREATE INDEX "ConversationTagMap_conversationId_idx" ON "ConversationTagMap"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationTagMap_tagId_idx" ON "ConversationTagMap"("tagId");

-- AddForeignKey
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTagMap" ADD CONSTRAINT "ConversationTagMap_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTagMap" ADD CONSTRAINT "ConversationTagMap_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ConversationTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
