/*
  Warnings:

  - You are about to drop the column `shopifyLinkSentAt` on the `WaCatalogOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyOrderId` on the `WaCatalogOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyOrderNumber` on the `WaCatalogOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyProductUrl` on the `WaCatalogOrder` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyProductHandle` on the `WaCatalogProduct` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyProductUrl` on the `WaCatalogProduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WaCatalogOrder" DROP COLUMN "shopifyLinkSentAt",
DROP COLUMN "shopifyOrderId",
DROP COLUMN "shopifyOrderNumber",
DROP COLUMN "shopifyProductUrl",
ADD COLUMN     "shopifyDraftOrderId" TEXT,
ADD COLUMN     "shopifyInvoiceUrl" TEXT;

-- AlterTable
ALTER TABLE "WaCatalogProduct" DROP COLUMN "shopifyProductHandle",
DROP COLUMN "shopifyProductUrl";

-- AlterTable
ALTER TABLE "WhatsappCatalog" ADD COLUMN     "autoCheckoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkoutMessage" TEXT;
