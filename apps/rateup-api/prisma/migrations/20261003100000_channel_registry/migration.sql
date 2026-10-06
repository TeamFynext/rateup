-- A generic channel registry. Every connected channel — each WhatsApp number, Messenger Page
-- and Instagram account, any number of each per org — becomes one "Channel" row, and
-- webchat and RCS join later as further platforms. Each platform keeps what only it needs in
-- its own 1:1 settings table: "WhatsappSettings" (gains "channelId") and the new
-- "MetaChannelSettings". Team grants move to one table, "TeamChannel", for every platform.
--
-- WhatsApp channels reuse their "WhatsappSettings" id as their "Channel" id, so team grants
-- and ids clients already hold carry over unchanged.
--
-- Expand + backfill only. Left in place, no longer read, for a later contract migration:
-- "TeamWhatsappChannel", and "WhatsappSettings"."fbPageId"/"ibaId"/"pageAccessToken"/
-- "igUserName"/"igDisplayName"/"fbUserName"/"instagramIceBreakers"/"instagramPersistentMenu".
--
-- Tokens are copied without decrypting. "pageAccessToken" is already in the inline
-- `<iv>:<ciphertext>` form (or legacy plaintext, which the reader accepts); the WhatsApp
-- token keeps its IV in a separate column, so it is joined into the same inline form.
-- One transaction, so a failure leaves nothing half-moved.

BEGIN;

-- CreateTable
CREATE TABLE "Channel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "accountId" TEXT NOT NULL,
    "address" TEXT,
    "name" TEXT,
    "username" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teamId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaChannelSettings" (
    "channelId" UUID NOT NULL,
    "fbPageId" TEXT NOT NULL,
    "pageName" TEXT,
    "pageAccessToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "appId" TEXT,
    "instagramIceBreakers" JSONB,
    "instagramPersistentMenu" JSONB,

    CONSTRAINT "MetaChannelSettings_pkey" PRIMARY KEY ("channelId")
);

-- CreateIndex
CREATE INDEX "Channel_orgId_platform_idx" ON "Channel"("orgId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_platform_accountId_key" ON "Channel"("platform", "accountId");

-- CreateIndex
CREATE INDEX "TeamChannel_channelId_idx" ON "TeamChannel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamChannel_teamId_channelId_key" ON "TeamChannel"("teamId", "channelId");

-- CreateIndex
CREATE INDEX "MetaChannelSettings_fbPageId_idx" ON "MetaChannelSettings"("fbPageId");


-- WhatsApp: one channel per number, keeping the settings row's id.
INSERT INTO "Channel" ("id", "orgId", "platform", "accountId", "address", "name", "status", "createdAt")
SELECT ws."id", ws."orgId", 'WHATSAPP'::"PlatformType",
       COALESCE(NULLIF(ws."phoneId", ''), ws."id"::text),
       ws."phone", ws."phoneDisplayName", ws."status", ws."createdAt"
FROM "WhatsappSettings" ws;

ALTER TABLE "WhatsappSettings" ADD COLUMN "channelId" UUID;
UPDATE "WhatsappSettings" SET "channelId" = "id";
ALTER TABLE "WhatsappSettings" ALTER COLUMN "channelId" SET NOT NULL;
CREATE UNIQUE INDEX "WhatsappSettings_channelId_key" ON "WhatsappSettings"("channelId");

-- Messenger: one channel per Page linked to a WhatsApp row. A Page without a token could
-- never send or receive, so it is not carried over.
WITH source AS (
    SELECT DISTINCT ON (ws."fbPageId") ws.*
    FROM "WhatsappSettings" ws
    WHERE ws."fbPageId" IS NOT NULL AND ws."fbPageId" <> ''
      AND ws."pageAccessToken" IS NOT NULL AND ws."pageAccessToken" <> ''
    ORDER BY ws."fbPageId", ws."createdAt"
), created AS (
    INSERT INTO "Channel" ("orgId", "platform", "accountId", "name", "createdAt")
    SELECT "orgId", 'FACEBOOK'::"PlatformType", "fbPageId", "fbUserName", "createdAt" FROM source
    RETURNING "id", "accountId"
)
INSERT INTO "MetaChannelSettings" ("channelId", "fbPageId", "pageName", "pageAccessToken", "accessToken", "appId")
SELECT c."id", s."fbPageId", s."fbUserName", s."pageAccessToken",
       CASE WHEN s."accessToken_iv" IS NOT NULL AND s."accessToken_iv" <> ''
            THEN s."accessToken_iv" || ':' || s."accessToken" ELSE s."accessToken" END,
       s."appId"
FROM created c JOIN source s ON s."fbPageId" = c."accountId";

-- Instagram: one channel per account linked to a WhatsApp row, sending through its Page.
WITH source AS (
    SELECT DISTINCT ON (ws."ibaId") ws.*
    FROM "WhatsappSettings" ws
    WHERE ws."ibaId" IS NOT NULL AND ws."ibaId" <> ''
      AND ws."fbPageId" IS NOT NULL AND ws."fbPageId" <> ''
      AND ws."pageAccessToken" IS NOT NULL AND ws."pageAccessToken" <> ''
    ORDER BY ws."ibaId", ws."createdAt"
), created AS (
    INSERT INTO "Channel" ("orgId", "platform", "accountId", "name", "username", "createdAt")
    SELECT "orgId", 'INSTAGRAM'::"PlatformType", "ibaId", "igDisplayName", "igUserName", "createdAt"
    FROM source
    RETURNING "id", "accountId"
)
INSERT INTO "MetaChannelSettings" (
    "channelId", "fbPageId", "pageName", "pageAccessToken", "accessToken", "appId",
    "instagramIceBreakers", "instagramPersistentMenu"
)
SELECT c."id", s."fbPageId", s."fbUserName", s."pageAccessToken",
       CASE WHEN s."accessToken_iv" IS NOT NULL AND s."accessToken_iv" <> ''
            THEN s."accessToken_iv" || ':' || s."accessToken" ELSE s."accessToken" END,
       s."appId", s."instagramIceBreakers", s."instagramPersistentMenu"
FROM created c JOIN source s ON s."ibaId" = c."accountId";

-- Team grants: the WhatsApp number itself, plus the Page and Instagram account that hung off it.
INSERT INTO "TeamChannel" ("teamId", "channelId", "createdAt")
SELECT twc."teamId", twc."channelId", twc."createdAt" FROM "TeamWhatsappChannel" twc
ON CONFLICT ("teamId", "channelId") DO NOTHING;

INSERT INTO "TeamChannel" ("teamId", "channelId")
SELECT twc."teamId", c."id"
FROM "TeamWhatsappChannel" twc
JOIN "WhatsappSettings" ws ON ws."id" = twc."channelId"
JOIN "Channel" c
  ON (c."platform" = 'FACEBOOK' AND c."accountId" = ws."fbPageId")
  OR (c."platform" = 'INSTAGRAM' AND c."accountId" = ws."ibaId")
ON CONFLICT ("teamId", "channelId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "WhatsappSettings" ADD CONSTRAINT "WhatsappSettings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChannel" ADD CONSTRAINT "TeamChannel_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChannel" ADD CONSTRAINT "TeamChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaChannelSettings" ADD CONSTRAINT "MetaChannelSettings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
