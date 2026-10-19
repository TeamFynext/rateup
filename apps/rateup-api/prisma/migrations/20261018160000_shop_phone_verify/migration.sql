-- AlterTable
ALTER TABLE "ShopStore" ADD COLUMN     "bankTransferHours" INTEGER NOT NULL DEFAULT 72;

-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ShopPhoneVerification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storeId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "variantId" UUID,
    "orderId" UUID,
    "method" TEXT,
    "phone" TEXT,
    "contactId" UUID,
    "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopPhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopPhoneVerification_storeId_code_key" ON "ShopPhoneVerification"("storeId", "code");

-- CreateIndex
CREATE INDEX "ShopPhoneVerification_storeId_expiresAt_idx" ON "ShopPhoneVerification"("storeId", "expiresAt");

-- AddForeignKey
ALTER TABLE "ShopPhoneVerification" ADD CONSTRAINT "ShopPhoneVerification_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ShopStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
