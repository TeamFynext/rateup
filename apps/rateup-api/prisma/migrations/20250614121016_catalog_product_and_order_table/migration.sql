/*
  Warnings:

  - You are about to drop the column `orders` on the `WhatsappCatalog` table. All the data in the column will be lost.
  - You are about to drop the column `products` on the `WhatsappCatalog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WhatsappCatalog" DROP COLUMN "orders",
DROP COLUMN "products";

-- CreateTable
CREATE TABLE "WaCatalogProduct" (
    "productDbId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalogId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "retailer_id" TEXT,
    "hotel_id" TEXT,
    "hotel_room_id" TEXT,
    "hotel_ratailer_id" TEXT,
    "productMetaId" TEXT,
    "productProps" JSONB,
    "hotelProps" JSONB,
    "hotelRoomProps" JSONB,

    CONSTRAINT "WaCatalogProduct_pkey" PRIMARY KEY ("productDbId")
);

-- CreateTable
CREATE TABLE "WaCatalogOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalogId" TEXT NOT NULL,
    "products" JSONB[],
    "contactId" UUID NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaCatalogOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaCatalogProduct_catalogId_retailer_id_key" ON "WaCatalogProduct"("catalogId", "retailer_id");

-- CreateIndex
CREATE UNIQUE INDEX "WaCatalogProduct_catalogId_hotel_id_key" ON "WaCatalogProduct"("catalogId", "hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "WaCatalogProduct_catalogId_hotel_ratailer_id_hotel_room_id_key" ON "WaCatalogProduct"("catalogId", "hotel_ratailer_id", "hotel_room_id");

-- AddForeignKey
ALTER TABLE "WaCatalogProduct" ADD CONSTRAINT "WaCatalogProduct_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "WhatsappCatalog"("catalogId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCatalogOrder" ADD CONSTRAINT "WaCatalogOrder_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "WhatsappCatalog"("catalogId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaCatalogOrder" ADD CONSTRAINT "WaCatalogOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
