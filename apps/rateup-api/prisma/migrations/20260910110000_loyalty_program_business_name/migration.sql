-- The onboarding profile step now asks for the business name and the programme name
-- separately; "name" stays the programme's own name.
ALTER TABLE "LoyaltyProgram" ADD COLUMN "businessName" TEXT;
