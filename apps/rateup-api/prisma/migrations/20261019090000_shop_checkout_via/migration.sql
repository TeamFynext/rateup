CREATE TYPE "ShopCheckoutVia" AS ENUM ('RATEUP', 'SHOPIFY', 'WOOCOMMERCE');

ALTER TABLE "ShopStore" ADD COLUMN "checkoutVia" "ShopCheckoutVia" NOT NULL DEFAULT 'RATEUP';

ALTER TABLE "ShopOrder" ADD COLUMN "checkoutVia" "ShopCheckoutVia" NOT NULL DEFAULT 'RATEUP',
ADD COLUMN "externalCheckoutUrl" TEXT;

-- Stores that already follow Shopify or WooCommerce check out there, as new ones will.
UPDATE "ShopStore" SET "checkoutVia" = 'SHOPIFY' WHERE "mode" = 'SHOPIFY';
UPDATE "ShopStore" SET "checkoutVia" = 'WOOCOMMERCE' WHERE "mode" = 'WOOCOMMERCE';
