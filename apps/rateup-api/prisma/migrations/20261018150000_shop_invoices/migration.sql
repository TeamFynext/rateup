-- AlterTable
ALTER TABLE "ShopStore" ADD COLUMN     "invoiceAutoSend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
ADD COLUMN     "invoiceNumberSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "businessAddress" TEXT;

-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoiceUrl" TEXT,
ADD COLUMN     "invoiceIssuedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_storeId_invoiceNumber_key" ON "ShopOrder"("storeId", "invoiceNumber");
