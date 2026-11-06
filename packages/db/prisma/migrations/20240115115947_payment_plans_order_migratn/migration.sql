-- CreateEnum
CREATE TYPE "PaymentPlanStatus" AS ENUM ('NULL', 'LIVE', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentPlanType" AS ENUM ('BASE', 'ADDON');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "basePlanId" UUID,
ADD COLUMN     "subscriptionRef" TEXT;

-- CreateTable
CREATE TABLE "PaymentPlans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "planId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "interval" INTEGER NOT NULL,
    "status" "PaymentPlanStatus" NOT NULL DEFAULT 'NULL',

    CONSTRAINT "PaymentPlans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "planId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "paymentId" UUID,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payId" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL,
    "rateupOrderId" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "description" TEXT,
    "customer_email" TEXT,
    "customer_phone" TEXT,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateupPlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "displayWidgetId" TEXT,
    "planType" "PaymentPlanType" NOT NULL,
    "paymentPlanId" UUID,

    CONSTRAINT "RateupPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentId_key" ON "Order"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payments_rateupOrderId_key" ON "Payments"("rateupOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "RateupPlan_paymentPlanId_key" ON "RateupPlan"("paymentPlanId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_basePlanId_fkey" FOREIGN KEY ("basePlanId") REFERENCES "RateupPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_rateupOrderId_fkey" FOREIGN KEY ("rateupOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateupPlan" ADD CONSTRAINT "RateupPlan_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
