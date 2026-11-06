/*
  Warnings:

  - A unique constraint covering the columns `[stripeId]` on the table `RateupPlan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StripeProductType" AS ENUM ('one_time', 'recurring');

-- AlterTable
ALTER TABLE "RateupPlan" ADD COLUMN     "stripeId" UUID;

-- CreateTable
CREATE TABLE "StripeProducts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL,
    "liveMode" BOOLEAN NOT NULL,
    "productId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "interval" TEXT NOT NULL,
    "intervalCount" INTEGER NOT NULL,
    "type" "StripeProductType" NOT NULL,
    "status" "PaymentPlanStatus" NOT NULL DEFAULT 'NULL',

    CONSTRAINT "StripeProducts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeProducts_productId_key" ON "StripeProducts"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RateupPlan_stripeId_key" ON "RateupPlan"("stripeId");

-- AddForeignKey
ALTER TABLE "RateupPlan" ADD CONSTRAINT "RateupPlan_stripeId_fkey" FOREIGN KEY ("stripeId") REFERENCES "StripeProducts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
