/*
  Warnings:

  - You are about to drop the `WhatsaAppCatalog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WhatsaAppCatalog" DROP CONSTRAINT "WhatsaAppCatalog_orgId_fkey";

-- DropTable
DROP TABLE "WhatsaAppCatalog";

-- CreateTable
CREATE TABLE "WhatsappCatalog" (
    "catalogId" TEXT NOT NULL,
    "orgId" UUID NOT NULL,
    "vertical" TEXT NOT NULL,
    "name" TEXT,
    "isWhatsappConnected" BOOLEAN NOT NULL DEFAULT false,
    "products" JSONB[],
    "orders" JSONB[]
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappCatalog_catalogId_key" ON "WhatsappCatalog"("catalogId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappCatalog_orgId_catalogId_key" ON "WhatsappCatalog"("orgId", "catalogId");

-- AddForeignKey
ALTER TABLE "WhatsappCatalog" ADD CONSTRAINT "WhatsappCatalog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
