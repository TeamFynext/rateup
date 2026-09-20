-- Indexes for /dashboard/analytics, which used to scan an org's whole message and
-- conversation history whatever date range was picked.
--
-- NOTE: plain (non-CONCURRENT) CREATE INDEX, because Prisma runs each migration
-- inside a transaction and CONCURRENTLY is not allowed there. Building an index on
-- "WaMessageOrgTeamMap" blocks writes to it (every outbound send inserts a row)
-- for the duration of the build. On production, run the CONCURRENTLY variants
-- below by hand *before* deploying; IF NOT EXISTS then makes this a no-op.
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "WaMessageOrgTeamMap_orgId_createdAt_idx" ON "WaMessageOrgTeamMap"("orgId", "createdAt");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "WaMessageOrgTeamMap_orgId_teamId_createdAt_idx" ON "WaMessageOrgTeamMap"("orgId", "teamId", "createdAt");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Conversation_orgId_closedAt_idx" ON "Conversation"("orgId", "closedAt");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "ConversationAssignedUserTeamMap_teamId_conversationId_idx" ON "ConversationAssignedUserTeamMap"("teamId", "conversationId");
--
-- Every index here is also declared in schema.prisma. One that is not gets
-- silently dropped by the next `prisma db push`, which is why the closedAt index
-- is a plain btree rather than a partial one (Prisma cannot express WHERE).

-- Message analytics and the message log: org- and team-scoped date range scans.
CREATE INDEX IF NOT EXISTS "WaMessageOrgTeamMap_orgId_createdAt_idx"
  ON "WaMessageOrgTeamMap"("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "WaMessageOrgTeamMap_orgId_teamId_createdAt_idx"
  ON "WaMessageOrgTeamMap"("orgId", "teamId", "createdAt");

-- Resolution rate, resolved-per-day, quick stats.
CREATE INDEX IF NOT EXISTS "Conversation_orgId_closedAt_idx"
  ON "Conversation"("orgId", "closedAt");

-- Team overview / team metrics start from a team.
CREATE INDEX IF NOT EXISTS "ConversationAssignedUserTeamMap_teamId_conversationId_idx"
  ON "ConversationAssignedUserTeamMap"("teamId", "conversationId");

-- Conversation."firstRespondedByUserAt" for rows that predate the column being kept
-- up to date on send is backfilled by `npm run backfill:first-responded`, not here:
-- the aggregate over "WaMessage" would hold write locks on "Conversation" for the whole
-- of this migration's transaction. Until it has run, the analytics queries fall back to
-- the messages of any conversation whose column is still NULL, so they stay correct.
