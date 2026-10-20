-- Partner API keys: several per org, SHA-256 hashed, with names, expiry, last use and the
-- API version (v1 or v2) each one opens.
-- Existing keys keep working: each gets an id and stays bcrypt-hashed until its first use
-- re-hashes it with SHA-256 (apiAccessToken.service.ts). Nothing here rewrites a key.

ALTER TABLE "ApiAccessToken" ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_pkey" PRIMARY KEY ("id");

ALTER TABLE "ApiAccessToken" ALTER COLUMN "accessToken" DROP NOT NULL;
ALTER TABLE "ApiAccessToken"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Default key',
  ADD COLUMN "tokenHash" TEXT,
  ADD COLUMN "displayPrefix" TEXT,
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'live',
  -- Every existing key belongs to the v1 API; v2 keys are minted with an explicit 'v2'.
  ADD COLUMN "version" TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "rotatedAt" TIMESTAMP(3),
  ADD COLUMN "createdById" UUID;

-- One key per org is no longer the rule.
DROP INDEX "ApiAccessToken_orgId_key";
CREATE INDEX "ApiAccessToken_orgId_idx" ON "ApiAccessToken"("orgId");
CREATE UNIQUE INDEX "ApiAccessToken_tokenHash_key" ON "ApiAccessToken"("tokenHash");

CREATE TABLE "ApiRequestLog" (
    "id" BIGSERIAL NOT NULL,
    "orgId" UUID NOT NULL,
    "keyId" UUID,
    "method" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiRequestLog_orgId_createdAt_idx" ON "ApiRequestLog"("orgId", "createdAt");
CREATE INDEX "ApiRequestLog_keyId_createdAt_idx" ON "ApiRequestLog"("keyId", "createdAt");

ALTER TABLE "ApiRequestLog" ADD CONSTRAINT "ApiRequestLog_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "ApiAccessToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
