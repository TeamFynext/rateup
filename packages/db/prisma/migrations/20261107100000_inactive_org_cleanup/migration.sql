-- Inactive workspace cleanup: warn the owner after a year without use, delete 30 days later.

-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "scheduledDeletionAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Org_lastActiveAt_idx" ON "Org"("lastActiveAt");

-- CreateIndex
CREATE INDEX "Org_scheduledDeletionAt_idx" ON "Org"("scheduledDeletionAt");

-- Backfill: the best record of use there is before this column existed. `lastLoggedInAt`
-- only covers email/password sign-ins and the audit log only covers writes, so this is a
-- floor, not the truth: an org flagged from it is cleared by its next sign-in, well inside
-- the 30-day grace period. GREATEST skips NULLs.
UPDATE "Org" o
SET "lastActiveAt" = GREATEST(
  o."createdAt",
  (SELECT MAX(u."lastLoggedInAt")
     FROM "OrgMember" m JOIN "User" u ON u.id = m."userId"
    WHERE m."orgId" = o.id),
  (SELECT MAX(a."createdAt") FROM "AuditLog" a WHERE a."orgId" = o.id)
);
