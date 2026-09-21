-- Authz: system role key beside the legacy role, API-key scopes, an archive for rows the
-- role migration sets aside, and one membership row per (team, user).

-- AlterTable
ALTER TABLE "OrgMember" ADD COLUMN "roleKey" TEXT;

-- AlterTable
ALTER TABLE "ApiAccessToken" ADD COLUMN "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "AuthzMigrationArchive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthzMigrationArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthzMigrationArchive_kind_idx" ON "AuthzMigrationArchive"("kind");

-- Duplicate memberships exist because TeamMember had no unique constraint. Keep the oldest
-- row of each pair so the constraint below can be created.
DELETE FROM "TeamMember" t
USING (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "teamId", "userId" ORDER BY "createdAt", "id") AS rn
    FROM "TeamMember"
) d
WHERE t."id" = d."id" AND d.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
