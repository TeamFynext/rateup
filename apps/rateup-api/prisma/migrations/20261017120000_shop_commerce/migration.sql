-- CreateEnum
CREATE TYPE "ShopSourceMode" AS ENUM ('NATIVE', 'SHOPIFY', 'WOOCOMMERCE');

-- CreateEnum
CREATE TYPE "ShopProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ShopMetaSyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCING', 'LIVE', 'REJECTED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ShopCheckoutVia" AS ENUM ('RATEUP', 'SHOPIFY', 'WOOCOMMERCE');

-- CreateEnum
CREATE TYPE "ShopChannel" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'STOREFRONT', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShopOrderStatus" AS ENUM ('DRAFT', 'OPEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShopCheckoutStage" AS ENUM ('ADDRESS', 'DELIVERY', 'LOYALTY', 'PAYMENT', 'DONE');

-- CreateEnum
CREATE TYPE "ShopPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED', 'EXPIRED', 'COD_PENDING');

-- CreateEnum
CREATE TYPE "ShopFulfillmentStatus" AS ENUM ('UNFULFILLED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShopDiscountType" AS ENUM ('PERCENTAGE', 'FIXED', 'FREE_SHIPPING', 'BUY_X_GET_Y');

-- CreateEnum
CREATE TYPE "ShopDiscountEligibility" AS ENUM ('ANYONE', 'FIRST_ORDER', 'LOYALTY_MEMBERS');

-- CreateEnum
CREATE TYPE "ShopReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "TriggerEvent" ADD VALUE 'SHOP_ORDER_EVENT';
ALTER TYPE "TriggerEvent" ADD VALUE 'WHATSAPP_AD_REFERRAL';

-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'SEND_SHOP_PRODUCTS';

-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "profileCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UsageStats" ADD COLUMN     "shopOrderLimitNotifiedPeriod" DATE,
ADD COLUMN     "shopOrderLimitWarnedPeriod" DATE,
ADD COLUMN     "shopOrdersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shopOrdersPeriodStart" DATE;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "bsuid" TEXT;

-- CreateTable
CREATE TABLE "ShopStore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "mode" "ShopSourceMode" NOT NULL DEFAULT 'NATIVE',
    "checkoutVia" "ShopCheckoutVia" NOT NULL DEFAULT 'RATEUP',
    "mirroredAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "taxRate" DECIMAL(5,2),
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "logoUrl" TEXT,
    "metaCatalogId" TEXT,
    "storefrontEnabled" BOOLEAN NOT NULL DEFAULT false,
    "storefrontTheme" JSONB,
    "askAddress" BOOLEAN NOT NULL DEFAULT true,
    "askDelivery" BOOLEAN NOT NULL DEFAULT true,
    "offerPoints" BOOLEAN NOT NULL DEFAULT true,
    "allowCoupons" BOOLEAN NOT NULL DEFAULT true,
    "pointValue" DECIMAL(12,4),
    "minPointsToRedeem" INTEGER NOT NULL DEFAULT 100,
    "maxPointsPct" INTEGER NOT NULL DEFAULT 50,
    "codEnabled" BOOLEAN NOT NULL DEFAULT false,
    "codConfirm" BOOLEAN NOT NULL DEFAULT true,
    "codConfirmHours" INTEGER NOT NULL DEFAULT 24,
    "codPrepaidDiscountPct" DECIMAL(5,2),
    "bankTransferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bankTransferHours" INTEGER NOT NULL DEFAULT 72,
    "bankDetails" JSONB,
    "defaultPaymentProvider" TEXT,
    "paymentLinkTtlHours" INTEGER NOT NULL DEFAULT 24,
    "cartReminderMinutes" INTEGER[] DEFAULT ARRAY[60, 1440]::INTEGER[],
    "cartReminderDiscountId" UUID,
    "notifications" JSONB,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "orderNumberSeq" INTEGER NOT NULL DEFAULT 1000,
    "messageRates" JSONB,
    "invoiceAutoSend" BOOLEAN NOT NULL DEFAULT false,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "invoiceNumberSeq" INTEGER NOT NULL DEFAULT 0,
    "taxId" TEXT,
    "businessAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShippingRate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storeId" UUID NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'Domestic',
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "name" TEXT NOT NULL,
    "minDays" INTEGER,
    "maxDays" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "freeOver" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCollection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "metaProductSetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storeId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "category" TEXT,
    "productUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ShopProductStatus" NOT NULL DEFAULT 'DRAFT',
    "options" JSONB,
    "showOnWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "showOnInstagram" BOOLEAN NOT NULL DEFAULT true,
    "showOnFacebook" BOOLEAN NOT NULL DEFAULT false,
    "showOnStorefront" BOOLEAN NOT NULL DEFAULT true,
    "loyaltyMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "externalSource" TEXT,
    "externalId" TEXT,
    "metaSyncStatus" "ShopMetaSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
    "metaSyncError" TEXT,
    "metaSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopVariant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Default',
    "optionValues" JSONB,
    "sku" TEXT,
    "retailerId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "compareAtPrice" DECIMAL(12,2),
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAt" INTEGER,
    "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "weightGrams" INTEGER,
    "externalId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopInventoryMovement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variantId" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" UUID,
    "userId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopInventoryMovement_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ShopBackInStockRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variantId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "channel" "ShopChannel" NOT NULL DEFAULT 'WHATSAPP',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopBackInStockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopDropClaim" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruleId" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "orderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopDropClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storeId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "contactId" UUID,
    "channel" "ShopChannel" NOT NULL,
    "source" TEXT,
    "channelAccountId" TEXT,
    "status" "ShopOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "checkoutStage" "ShopCheckoutStage" NOT NULL DEFAULT 'ADDRESS',
    "paymentStatus" "ShopPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "fulfillmentStatus" "ShopFulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "paymentMethod" TEXT,
    "currency" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pointsDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pointsRedeemed" INTEGER NOT NULL DEFAULT 0,
    "shippingTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountCode" TEXT,
    "discountId" UUID,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "customerEmail" TEXT,
    "shippingAddress" JSONB,
    "shippingRate" JSONB,
    "checkoutToken" TEXT,
    "checkoutExpiresAt" TIMESTAMP(3),
    "attribution" JSONB,
    "adConversionSentAt" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "invoiceKey" TEXT,
    "invoiceIssuedAt" TIMESTAMP(3),
    "invoiceSentAt" TIMESTAMP(3),
    "reservedAt" TIMESTAMP(3),
    "reviewReason" TEXT,
    "amountDue" DECIMAL(12,2),
    "note" TEXT,
    "staffNote" TEXT,
    "externalProvider" TEXT,
    "externalId" TEXT,
    "checkoutVia" "ShopCheckoutVia" NOT NULL DEFAULT 'RATEUP',
    "externalCheckoutUrl" TEXT,
    "externalName" TEXT,
    "externalPaidAt" TIMESTAMP(3),
    "legacyWaOrderId" UUID,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "placedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "variantId" UUID,
    "productId" UUID,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "sku" TEXT,
    "retailerId" TEXT,
    "imageUrl" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ShopPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "linkUrl" TEXT,
    "providerRef" TEXT,
    "providerPaymentId" TEXT,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "raw" JSONB,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopDiscount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storeId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "type" "ShopDiscountType" NOT NULL,
    "value" DECIMAL(12,2),
    "buyQty" INTEGER,
    "getQty" INTEGER,
    "minSubtotal" DECIMAL(12,2),
    "appliesTo" TEXT NOT NULL DEFAULT 'ALL',
    "collectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibility" "ShopDiscountEligibility" NOT NULL DEFAULT 'ANYONE',
    "usageLimit" INTEGER,
    "perCustomerLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopDiscountRedemption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "discountId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "contactId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopDiscountRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopShipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "providerRef" TEXT,
    "carrier" TEXT,
    "service" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "labelUrl" TEXT,
    "status" "ShopFulfillmentStatus" NOT NULL DEFAULT 'SHIPPED',
    "cost" DECIMAL(12,2),
    "events" JSONB,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopReturn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "status" "ShopReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "refundAmount" DECIMAL(12,2),
    "restock" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ShopReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdReferral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "conversationId" UUID,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "headline" TEXT,
    "body" TEXT,
    "mediaType" TEXT,
    "mediaUrl" TEXT,
    "ctwaClid" TEXT,
    "phoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ShopCollectionToShopProduct" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ShopCollectionToShopProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopStore_orgId_key" ON "ShopStore"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopStore_slug_key" ON "ShopStore"("slug");

-- CreateIndex
CREATE INDEX "ShopShippingRate_storeId_idx" ON "ShopShippingRate"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCollection_storeId_slug_key" ON "ShopCollection"("storeId", "slug");

-- CreateIndex
CREATE INDEX "ShopProduct_storeId_status_idx" ON "ShopProduct"("storeId", "status");

-- CreateIndex
CREATE INDEX "ShopProduct_orgId_idx" ON "ShopProduct"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopProduct_storeId_externalSource_externalId_key" ON "ShopProduct"("storeId", "externalSource", "externalId");

-- CreateIndex
CREATE INDEX "ShopVariant_productId_idx" ON "ShopVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopVariant_storeId_retailerId_key" ON "ShopVariant"("storeId", "retailerId");

-- CreateIndex
CREATE INDEX "ShopInventoryMovement_variantId_createdAt_idx" ON "ShopInventoryMovement"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopPhoneVerification_storeId_expiresAt_idx" ON "ShopPhoneVerification"("storeId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPhoneVerification_storeId_code_key" ON "ShopPhoneVerification"("storeId", "code");

-- CreateIndex
CREATE INDEX "ShopBackInStockRequest_variantId_notifiedAt_idx" ON "ShopBackInStockRequest"("variantId", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopBackInStockRequest_variantId_contactId_key" ON "ShopBackInStockRequest"("variantId", "contactId");

-- CreateIndex
CREATE INDEX "ShopDropClaim_orderId_idx" ON "ShopDropClaim"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDropClaim_ruleId_recipient_key" ON "ShopDropClaim"("ruleId", "recipient");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_checkoutToken_key" ON "ShopOrder"("checkoutToken");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_legacyWaOrderId_key" ON "ShopOrder"("legacyWaOrderId");

-- CreateIndex
CREATE INDEX "ShopOrder_orgId_createdAt_idx" ON "ShopOrder"("orgId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ShopOrder_status_checkoutExpiresAt_idx" ON "ShopOrder"("status", "checkoutExpiresAt");

-- CreateIndex
CREATE INDEX "ShopOrder_storeId_status_paymentStatus_idx" ON "ShopOrder"("storeId", "status", "paymentStatus");

-- CreateIndex
CREATE INDEX "ShopOrder_contactId_idx" ON "ShopOrder"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_storeId_number_key" ON "ShopOrder"("storeId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_storeId_invoiceNumber_key" ON "ShopOrder"("storeId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "ShopOrderItem_orderId_idx" ON "ShopOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "ShopOrderItem_variantId_idx" ON "ShopOrderItem"("variantId");

-- CreateIndex
CREATE INDEX "ShopPayment_orderId_idx" ON "ShopPayment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPayment_provider_providerRef_key" ON "ShopPayment"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "ShopOrderEvent_orderId_createdAt_idx" ON "ShopOrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDiscount_storeId_code_key" ON "ShopDiscount"("storeId", "code");

-- CreateIndex
CREATE INDEX "ShopDiscountRedemption_discountId_contactId_idx" ON "ShopDiscountRedemption"("discountId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDiscountRedemption_discountId_orderId_key" ON "ShopDiscountRedemption"("discountId", "orderId");

-- CreateIndex
CREATE INDEX "ShopShipment_orderId_idx" ON "ShopShipment"("orderId");

-- CreateIndex
CREATE INDEX "ShopShipment_provider_providerRef_idx" ON "ShopShipment"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "ShopReturn_orderId_idx" ON "ShopReturn"("orderId");

-- CreateIndex
CREATE INDEX "AdReferral_contactId_createdAt_idx" ON "AdReferral"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "AdReferral_orgId_createdAt_idx" ON "AdReferral"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AdReferral_orgId_sourceId_idx" ON "AdReferral"("orgId", "sourceId");

-- CreateIndex
CREATE INDEX "_ShopCollectionToShopProduct_B_index" ON "_ShopCollectionToShopProduct"("B");

-- AddForeignKey
ALTER TABLE "ShopStore" ADD CONSTRAINT "ShopStore_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShippingRate" ADD CONSTRAINT "ShopShippingRate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ShopStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCollection" ADD CONSTRAINT "ShopCollection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ShopStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ShopStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopVariant" ADD CONSTRAINT "ShopVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInventoryMovement" ADD CONSTRAINT "ShopInventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ShopVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPhoneVerification" ADD CONSTRAINT "ShopPhoneVerification_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ShopStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopBackInStockRequest" ADD CONSTRAINT "ShopBackInStockRequest_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ShopVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopBackInStockRequest" ADD CONSTRAINT "ShopBackInStockRequest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopDropClaim" ADD CONSTRAINT "ShopDropClaim_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ShopStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ShopVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPayment" ADD CONSTRAINT "ShopPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderEvent" ADD CONSTRAINT "ShopOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopDiscount" ADD CONSTRAINT "ShopDiscount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ShopStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopDiscountRedemption" ADD CONSTRAINT "ShopDiscountRedemption_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "ShopDiscount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopDiscountRedemption" ADD CONSTRAINT "ShopDiscountRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopShipment" ADD CONSTRAINT "ShopShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopReturn" ADD CONSTRAINT "ShopReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdReferral" ADD CONSTRAINT "AdReferral_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdReferral" ADD CONSTRAINT "AdReferral_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdReferral" ADD CONSTRAINT "AdReferral_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShopCollectionToShopProduct" ADD CONSTRAINT "_ShopCollectionToShopProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "ShopCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShopCollectionToShopProduct" ADD CONSTRAINT "_ShopCollectionToShopProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every org that exists today gave its business details at signup.
UPDATE "Org" SET "profileCompletedAt" = "createdAt";
