-- Typical order value for a loyalty program, self-reported by the merchant.
--
-- This is the denominator the giveback estimate needs. Points are earned per
-- currency unit spent (`LoyaltyEarningRule.pointsPerUnit`) but their *value* is
-- only implied by the rewards catalog — a reward's monetary worth divided by its
-- `pointsCost`. Turning that into "what percentage of revenue am I giving back"
-- needs a per-order spend figure, and there is none to derive one from:
-- `LoyaltyTransaction` records no purchase amount (only an untyped
-- `metadata.purchaseAmount`), and `CustomerLoyaltyAccount.totalSpend` is a
-- lifetime cumulative with no time dimension.
--
-- Nullable with no default, deliberately. NULL means "the merchant never told
-- us", which the UI renders as a prompt rather than a number. A 0 default would
-- read as a real answer and make every percentage-discount reward price at zero.
--
-- Decimal(12,2) matches the other money columns on these tables
-- (`LoyaltyTier.threshold`, `CustomerLoyaltyAccount.totalSpend`).

ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "averageOrderValue" DECIMAL(12,2);
