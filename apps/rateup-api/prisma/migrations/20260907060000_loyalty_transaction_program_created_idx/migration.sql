-- The loyalty Overview aggregates one programme's ledger over a date window; every one
-- of its queries filters on ("programId", "createdAt"). Plain CREATE INDEX: Prisma runs
-- migrations inside a transaction, where CONCURRENTLY is not available.
CREATE INDEX "LoyaltyTransaction_programId_createdAt_idx" ON "LoyaltyTransaction"("programId", "createdAt" DESC);
