ALTER TABLE "ShopStore" ADD COLUMN "mirroredAt" TIMESTAMP(3);

ALTER TABLE "ShopOrder" ADD COLUMN "externalName" TEXT,
ADD COLUMN "externalPaidAt" TIMESTAMP(3);

-- A store-checkout shop's drafts that never reached the store pay there, as new drafts do.
UPDATE "ShopOrder" o SET "checkoutVia" = s."checkoutVia", "checkoutStage" = 'PAYMENT'
FROM "ShopStore" s
WHERE o."storeId" = s.id AND o.status = 'DRAFT' AND o."checkoutVia" = 'RATEUP'
  AND s."checkoutVia" <> 'RATEUP' AND o."externalCheckoutUrl" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "ShopPayment" p WHERE p."orderId" = o.id AND p.status = 'PENDING');
