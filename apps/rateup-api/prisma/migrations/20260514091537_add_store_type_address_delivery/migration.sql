-- AlterTable
ALTER TABLE "WaCatalogOrder" ADD COLUMN     "deliveryOption" JSONB,
ADD COLUMN     "orderStage" TEXT DEFAULT 'PENDING_ADDRESS',
ADD COLUMN     "shippingAddress" JSONB,
ADD COLUMN     "storeType" TEXT;

-- AlterTable
ALTER TABLE "WhatsappCatalog" ADD COLUMN     "addressFlowDbId" TEXT,
ADD COLUMN     "addressFlowFields" JSONB,
ADD COLUMN     "addressFlowId" TEXT,
ADD COLUMN     "addressFlowStatus" TEXT DEFAULT 'idle',
ADD COLUMN     "deliveryOptions" JSONB,
ADD COLUMN     "standardPaymentConfig" JSONB,
ADD COLUMN     "standardPaymentMethod" TEXT,
ADD COLUMN     "storeType" TEXT DEFAULT 'standard';

-- CreateIndex
CREATE INDEX "WaCatalogOrder_catalogId_createdAt_idx" ON "WaCatalogOrder"("catalogId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WaCatalogOrder_contactId_idx" ON "WaCatalogOrder"("contactId");

-- CreateIndex
CREATE INDEX "WaCatalogOrder_orderStage_idx" ON "WaCatalogOrder"("orderStage");
