/*
  Warnings:

  - A unique constraint covering the columns `[orgId,date,pageType,provider]` on the table `ShopifyWidgetStat` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ShopifyWidgetStat_orgId_date_pageType_key";

-- AlterTable
ALTER TABLE "ShopifyWidgetStat" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'shopify';

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyWidgetStat_orgId_date_pageType_provider_key" ON "ShopifyWidgetStat"("orgId", "date", "pageType", "provider");
