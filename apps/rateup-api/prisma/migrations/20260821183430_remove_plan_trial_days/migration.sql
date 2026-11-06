-- Trials are no longer offered. `RateupPlan.trialDays` had exactly one reader — the
-- checkout that set Razorpay's `start_at` — and that path is gone, so the column is
-- inert. Dropping it keeps the catalog from advertising a trial nothing implements.
ALTER TABLE "RateupPlan" DROP COLUMN "trialDays";
