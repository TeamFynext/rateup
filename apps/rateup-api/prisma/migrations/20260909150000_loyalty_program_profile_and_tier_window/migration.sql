-- Venue & branding profile fields and the rolling tier-qualification window.
ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "tierQualificationWindowMonths" INTEGER,
  ADD COLUMN "timezone" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "brandColor" TEXT,
  ADD COLUMN "heroImageUrl" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "contactEmail" TEXT;

-- The wizard's first step was renamed from "basics" to "profile"; a stored "basics" would
-- make the wizard resume at a step that no longer exists.
UPDATE "LoyaltyProgram" SET "onboardingStep" = 'profile' WHERE "onboardingStep" = 'basics';
