-- The catalog now carries a dollar list price per tier alongside the rupee one, so the
-- pricing page can show real USD instead of converting INR at a fixed rate.
ALTER TABLE "RateupPlan" ADD COLUMN "usdMonthlyPrice" DOUBLE PRECISION;
ALTER TABLE "RateupPlan" ADD COLUMN "usdYearlyPrice" DOUBLE PRECISION;
