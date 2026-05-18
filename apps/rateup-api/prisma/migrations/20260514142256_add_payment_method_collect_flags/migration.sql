-- AlterTable
ALTER TABLE "WhatsappCatalog" ADD COLUMN     "collectAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collectDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethod" TEXT;
