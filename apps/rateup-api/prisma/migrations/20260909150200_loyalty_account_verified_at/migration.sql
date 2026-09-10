-- Web self-signups hold their bonus points until the customer is seen on WhatsApp or at the till.
ALTER TABLE "CustomerLoyaltyAccount"
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "pendingBonuses" JSONB;

-- Every account that exists today was credited on creation; treat it as verified then.
UPDATE "CustomerLoyaltyAccount" SET "verifiedAt" = "createdAt";

ALTER TABLE "CustomerLoyaltyAccount" ALTER COLUMN "verifiedAt" SET DEFAULT CURRENT_TIMESTAMP;
