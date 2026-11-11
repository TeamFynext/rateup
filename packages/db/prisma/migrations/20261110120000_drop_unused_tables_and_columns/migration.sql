-- Drops tables and columns that no code reads or writes (checked 2026-11-10: removing each from
-- the schema leaves the API and both workers type-correct, and no raw SQL names them).
--
-- Tables:
--   TeamWhatsappChannel  superseded by TeamChannel; 20261003100000_channel_registry copied it
--                        and left it for this contract step.
--   TeamFeatureAccess    per-team feature grants, replaced by roles and permissions.
--   RM_Topic, NLP_Cache  reputation-management topics and an NLP cache from 2023.
--   AuthzMigrationArchive  the rows 20260920120000_authz_role_keys set aside to undo it.
-- Columns:
--   WhatsappSettings     the Messenger/Instagram copies (fbPageId, ibaId, pageAccessToken,
--                        igUserName, igDisplayName, fbUserName, instagramIceBreakers,
--                        instagramPersistentMenu), moved to Channel/MetaChannelSettings by
--                        20261003100000 and no longer read.
--   the rest             written by no code: old chatbot WhatsApp options, Contact.isAiBotActive,
--                        LoyaltyReferral transaction ids, Pipeline.lifecycleSyncEnabled,
--                        ShopCollection.metaProductSetId and two Instagram Login token columns.
--
-- Data in these tables and columns is deleted. Back them up first if any of it should be kept.

-- Each DROP COLUMN is a quick catalogue change, but it needs a brief exclusive lock. Fail
-- rather than queue every Contact and Chatbot query behind a long-running transaction.
SET lock_timeout = '10s';
-- DropForeignKey
ALTER TABLE "TeamFeatureAccess" DROP CONSTRAINT "TeamFeatureAccess_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamWhatsappChannel" DROP CONSTRAINT "TeamWhatsappChannel_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamWhatsappChannel" DROP CONSTRAINT "TeamWhatsappChannel_channelId_fkey";

-- DropForeignKey
ALTER TABLE "RM_Topic" DROP CONSTRAINT "RM_Topic_teamId_fkey";

-- DropIndex
DROP INDEX "WhatsappSettings_fbPageId_key";

-- DropIndex
DROP INDEX "WhatsappSettings_ibaId_key";

-- AlterTable
ALTER TABLE "WhatsappSettings" DROP COLUMN "fbPageId",
DROP COLUMN "fbUserName",
DROP COLUMN "ibaId",
DROP COLUMN "igDisplayName",
DROP COLUMN "igUserName",
DROP COLUMN "instagramIceBreakers",
DROP COLUMN "instagramPersistentMenu",
DROP COLUMN "pageAccessToken";

-- AlterTable
ALTER TABLE "MetaChannelSettings" DROP COLUMN "reconnectRequiredAt",
DROP COLUMN "tokenRefreshedAt";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "isAiBotActive";

-- AlterTable
ALTER TABLE "Chatbot" DROP COLUMN "enableAllWaChat",
DROP COLUMN "enableWaChat",
DROP COLUMN "publicPageStatus",
DROP COLUMN "waCommand",
DROP COLUMN "waPrompt";

-- AlterTable
ALTER TABLE "LoyaltyReferral" DROP COLUMN "refereeTransactionId",
DROP COLUMN "referrerTransactionId";

-- AlterTable
ALTER TABLE "Pipeline" DROP COLUMN "lifecycleSyncEnabled";

-- AlterTable
ALTER TABLE "ShopCollection" DROP COLUMN "metaProductSetId";

-- DropTable
DROP TABLE "TeamFeatureAccess";

-- DropTable
DROP TABLE "TeamWhatsappChannel";

-- DropTable
DROP TABLE "RM_Topic";

-- DropTable
DROP TABLE "NLP_Cache";

-- DropTable
DROP TABLE "AuthzMigrationArchive";
