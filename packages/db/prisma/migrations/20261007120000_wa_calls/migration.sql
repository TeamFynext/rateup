-- WhatsApp Cloud API voice calls (the `calls` webhook field). One row per call;
-- the thread entry for a finished call is an internal WaMessage linked by logMessageId.

-- CreateEnum
CREATE TYPE "WaCallDirection" AS ENUM ('USER_INITIATED', 'BUSINESS_INITIATED');

-- CreateEnum
CREATE TYPE "WaCallStatus" AS ENUM ('RINGING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'MISSED', 'FAILED');

-- CreateTable
CREATE TABLE "WaCall" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "waCallId" TEXT NOT NULL,
    "phoneId" TEXT NOT NULL,
    "direction" "WaCallDirection" NOT NULL,
    "status" "WaCallStatus" NOT NULL DEFAULT 'RINGING',
    "customerWaId" TEXT NOT NULL,
    "contactId" UUID,
    "conversationId" UUID,
    "initiatedById" UUID,
    "answeredById" UUID,
    "answeredAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "logMessageId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaCall_waCallId_key" ON "WaCall"("waCallId");

-- CreateIndex
CREATE INDEX "WaCall_orgId_createdAt_idx" ON "WaCall"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "WaCall_contactId_createdAt_idx" ON "WaCall"("contactId", "createdAt");

-- AddForeignKey
ALTER TABLE "WaCall" ADD CONSTRAINT "WaCall_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCall" ADD CONSTRAINT "WaCall_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

