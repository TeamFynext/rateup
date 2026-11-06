-- Quick replies can carry image, audio and video attachments alongside their text.
ALTER TABLE "WhatsappQuickReply" ADD COLUMN "media" JSONB NOT NULL DEFAULT '[]';
