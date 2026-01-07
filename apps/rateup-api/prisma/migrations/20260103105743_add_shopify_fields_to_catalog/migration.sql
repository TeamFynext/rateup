-- AlterTable
ALTER TABLE "WaCatalogOrder" ADD COLUMN     "shopifyLinkSentAt" TIMESTAMP(3),
ADD COLUMN     "shopifyOrderId" TEXT,
ADD COLUMN     "shopifyOrderNumber" TEXT,
ADD COLUMN     "shopifyProductUrl" TEXT;

-- AlterTable
ALTER TABLE "WaCatalogProduct" ADD COLUMN     "shopifyProductHandle" TEXT,
ADD COLUMN     "shopifyProductUrl" TEXT;
