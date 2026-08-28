-- Progress store for the guided loyalty setup wizard
-- (`/dashboard/loyalty/onboarding`).
--
-- The wizard commits each step to the real tables as the user goes, leaving the
-- program at status 'draft' — and therefore silent, since both the outbound
-- dispatcher and the inbound command handler gate on status = 'active' — until
-- the final activate step. That means "where did they get to" cannot be derived
-- from the program row alone, and deriving it from child row counts would bounce
-- a user back into the wizard the moment they deleted their last reward.
--
-- `onboardingPresetKey` records which business-type preset pack was chosen in
-- step 1, so later steps stay consistent with it across sessions.
--
-- All three are nullable with no default: existing programs read as "never used
-- the wizard", which is exactly right.

ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "onboardingPresetKey"   TEXT,
  ADD COLUMN "onboardingStep"        TEXT,
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
