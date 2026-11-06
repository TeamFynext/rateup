-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "shortUrlId" TEXT;

-- Backfill: 8 characters from nanoid-dictionary's `nolookalikesSafe`, the
-- alphabet `getShortUrlId()` uses. The `l.id` reference keeps the subquery
-- correlated, so Postgres draws a fresh id per row rather than one for all.
UPDATE "Lead" l
SET "shortUrlId" = (
  SELECT string_agg(
    substr('6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz', 1 + floor(random() * 36)::int, 1),
    ''
  )
  FROM generate_series(1, 8)
  WHERE l.id IS NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_shortUrlId_key" ON "Lead"("shortUrlId");
