-- A Razorpay plan carries exactly one currency, so a tier that sells in both INR and USD
-- needs a separate gateway plan per currency and cadence.
ALTER TABLE "RateupPlan" ADD COLUMN "usdMonthlyPaymentPlanId" UUID;
ALTER TABLE "RateupPlan" ADD COLUMN "usdYearlyPaymentPlanId" UUID;
CREATE UNIQUE INDEX "RateupPlan_usdMonthlyPaymentPlanId_key" ON "RateupPlan"("usdMonthlyPaymentPlanId");
CREATE UNIQUE INDEX "RateupPlan_usdYearlyPaymentPlanId_key" ON "RateupPlan"("usdYearlyPaymentPlanId");
ALTER TABLE "RateupPlan" ADD CONSTRAINT "RateupPlan_usdMonthlyPaymentPlanId_fkey"
  FOREIGN KEY ("usdMonthlyPaymentPlanId") REFERENCES "PaymentPlans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RateupPlan" ADD CONSTRAINT "RateupPlan_usdYearlyPaymentPlanId_fkey"
  FOREIGN KEY ("usdYearlyPaymentPlanId") REFERENCES "PaymentPlans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
