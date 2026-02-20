ALTER TABLE "WaAutomatedReply" ALTER COLUMN "platform" SET DEFAULT 'WHATSAPP';

UPDATE "WaAutomatedReply" SET "platform" = 'WHATSAPP' WHERE "platform" = 'whatsapp';
UPDATE "WaAutomatedReply" SET "platform" = 'INSTAGRAM' WHERE "platform" = 'instagram';
