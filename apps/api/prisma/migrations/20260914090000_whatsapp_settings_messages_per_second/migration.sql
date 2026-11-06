-- Per-number send ceiling for the campaign dispatcher's rate limiter. NULL
-- means the platform default (80 messages/second, Meta's baseline). Set it for
-- numbers Meta has raised above that.

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN "messagesPerSecond" INTEGER;
