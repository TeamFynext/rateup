-- CreateTable
CREATE TABLE "WhatsappQuickReply" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,

    CONSTRAINT "WhatsappQuickReply_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WhatsappQuickReply" ADD CONSTRAINT "WhatsappQuickReply_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
