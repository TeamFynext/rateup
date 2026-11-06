-- CreateEnum
CREATE TYPE "ShopifyCheckoutStatus" AS ENUM ('OPEN', 'RECOVERED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ShopifyCheckoutReminderStatus" AS ENUM ('SCHEDULED', 'SENDING', 'SENT', 'SKIPPED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ShopifyCheckout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "acceptsMarketing" BOOLEAN NOT NULL DEFAULT false,
    "body" JSONB NOT NULL,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shopifyUpdatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ShopifyCheckoutStatus" NOT NULL DEFAULT 'OPEN',
    "recoveredOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyCheckoutReminder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checkoutId" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "ShopifyCheckoutReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reason" TEXT,
    "sentAt" TIMESTAMP(3),
    "linkCode" TEXT NOT NULL,
    "waMessageId" TEXT,
    "clickedAt" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "attributedOrderId" TEXT,
    "attributedAt" TIMESTAMP(3),
    "revenue" DECIMAL(12,2),
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyCheckoutReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopifyCheckout_orgId_token_idx" ON "ShopifyCheckout"("orgId", "token");

-- CreateIndex
CREATE INDEX "ShopifyCheckout_shop_idx" ON "ShopifyCheckout"("shop");

-- CreateIndex
CREATE INDEX "ShopifyCheckout_status_shopifyUpdatedAt_idx" ON "ShopifyCheckout"("status", "shopifyUpdatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyCheckout_orgId_shopifyId_key" ON "ShopifyCheckout"("orgId", "shopifyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyCheckoutReminder_linkCode_key" ON "ShopifyCheckoutReminder"("linkCode");

-- CreateIndex
CREATE INDEX "ShopifyCheckoutReminder_status_dueAt_idx" ON "ShopifyCheckoutReminder"("status", "dueAt");

-- CreateIndex
CREATE INDEX "ShopifyCheckoutReminder_ruleId_sentAt_idx" ON "ShopifyCheckoutReminder"("ruleId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyCheckoutReminder_checkoutId_ruleId_key" ON "ShopifyCheckoutReminder"("checkoutId", "ruleId");

-- AddForeignKey
ALTER TABLE "ShopifyCheckout" ADD CONSTRAINT "ShopifyCheckout_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyCheckoutReminder" ADD CONSTRAINT "ShopifyCheckoutReminder_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "ShopifyCheckout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyCheckoutReminder" ADD CONSTRAINT "ShopifyCheckoutReminder_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

