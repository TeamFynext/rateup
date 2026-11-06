-- Team activity filters an org's log by date range, newest first. The new index
-- covers every query the org-only one served, so that one is dropped.
--
-- NOTE: plain (non-CONCURRENT) CREATE INDEX, because Prisma runs each migration
-- inside a transaction. Building it blocks writes to "AuditLog" (every audited
-- request inserts a row) for the duration. On production, run this by hand
-- *before* deploying; IF NOT EXISTS then makes the statement below a no-op.
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

DROP INDEX IF EXISTS "AuditLog_orgId_idx";
