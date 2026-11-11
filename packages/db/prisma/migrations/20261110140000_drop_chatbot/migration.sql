-- The old AI chatbot (one per org, with a public chat page at its `shortUrlId` link, and an
-- "AI bot" automation step that recorded the contact's bot in Contact."chatbotId"). The code
-- that read and wrote them was removed on 2026-09-26; the bot's WhatsApp columns and
-- Contact."isAiBotActive" went in 20261110120000_drop_unused_tables_and_columns. The Journeys
-- feature (modules/chatbots) uses neither: it lives in WaAutomatedReply,
-- WaAutomatedReplyMessage and Rule.

-- Fail rather than queue every Contact query behind a long transaction.
SET lock_timeout = '10s';

-- DropForeignKey
ALTER TABLE "Chatbot" DROP CONSTRAINT "Chatbot_orgId_fkey";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "chatbotId";

-- DropTable
DROP TABLE "Chatbot";
