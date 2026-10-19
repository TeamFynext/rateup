-- Invoices were stored as public CloudFront URLs; keep only the object key.
ALTER TABLE "ShopOrder" RENAME COLUMN "invoiceUrl" TO "invoiceKey";

UPDATE "ShopOrder"
SET "invoiceKey" = regexp_replace("invoiceKey", '^https?://[^/]+/', '')
WHERE "invoiceKey" ~ '^https?://';
