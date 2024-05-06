-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('none', 'created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "subscriptionChargeAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionEndedAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus";
