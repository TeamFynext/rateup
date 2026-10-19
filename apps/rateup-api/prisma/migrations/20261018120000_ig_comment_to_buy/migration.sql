-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'SEND_SHOP_PRODUCTS';

-- CreateTable
CREATE TABLE "ShopDropClaim" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruleId" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "orderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopDropClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopDropClaim_ruleId_recipient_key" ON "ShopDropClaim"("ruleId", "recipient");

-- AddForeignKey
ALTER TABLE "ShopDropClaim" ADD CONSTRAINT "ShopDropClaim_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
