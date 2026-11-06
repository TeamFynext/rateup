-- A revoked (deleted) WhatsApp message is flagged, never removed: the body stays
-- so the thread can still show that something was sent and then deleted.

-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN "deletedAt" TIMESTAMP(3);
