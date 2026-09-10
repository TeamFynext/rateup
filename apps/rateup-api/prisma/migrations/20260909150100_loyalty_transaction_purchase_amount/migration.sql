-- Typed purchase amount on ledger rows so trailing-window spend can be summed with an index.
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "purchaseAmount" DECIMAL(12,2);

UPDATE "LoyaltyTransaction"
  SET "purchaseAmount" = (metadata->>'purchaseAmount')::numeric
  WHERE source = 'purchase' AND jsonb_typeof(metadata->'purchaseAmount') = 'number';
