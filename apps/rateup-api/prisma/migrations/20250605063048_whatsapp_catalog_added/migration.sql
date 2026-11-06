-- AlterEnum
ALTER TYPE "TemplateType" ADD VALUE 'CAROUSEL';

-- CreateTable
CREATE TABLE "WhatsaAppCatalog" (
    "catalogId" TEXT NOT NULL,
    "orgId" UUID NOT NULL,
    "vertical" TEXT NOT NULL,
    "name" TEXT,
    "isWhatsappConnected" BOOLEAN NOT NULL DEFAULT false,
    "products" JSONB[],
    "orders" JSONB[]
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsaAppCatalog_catalogId_key" ON "WhatsaAppCatalog"("catalogId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsaAppCatalog_orgId_catalogId_key" ON "WhatsaAppCatalog"("orgId", "catalogId");

-- AddForeignKey
ALTER TABLE "WhatsaAppCatalog" ADD CONSTRAINT "WhatsaAppCatalog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
