-- The campaign list is scoped by org through Team, so it walks Team.orgId and
-- then Campaign.teamId. Neither foreign key was indexed, leaving the list to
-- sequentially scan Campaign once per team on every request.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Team_orgId_idx" ON "Team"("orgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Campaign_teamId_type_createdAt_idx" ON "Campaign"("teamId", "type", "createdAt" DESC);
