/*
  Warnings:

  - A unique constraint covering the columns `[subscriptionRef]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriptionRef_key" ON "Subscription"("subscriptionRef");
