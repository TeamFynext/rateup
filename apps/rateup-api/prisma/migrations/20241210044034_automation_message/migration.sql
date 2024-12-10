-- CreateTable
CREATE TABLE "WaAutomatedReplyMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "currentScreen" TEXT NOT NULL,
    "waAutomatedReplyId" UUID,
    "orgId" UUID NOT NULL,

    CONSTRAINT "WaAutomatedReplyMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WaAutomatedReplyMessage" ADD CONSTRAINT "WaAutomatedReplyMessage_waAutomatedReplyId_fkey" FOREIGN KEY ("waAutomatedReplyId") REFERENCES "WaAutomatedReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaAutomatedReplyMessage" ADD CONSTRAINT "WaAutomatedReplyMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
