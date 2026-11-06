-- CreateTable
CREATE TABLE "LoyaltyCampaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "maxPerReferrer" INTEGER,
    "maxPerUser" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "referrerRewardId" UUID,
    "userRewardId" UUID,
    "orgId" UUID NOT NULL,

    CONSTRAINT "LoyaltyCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LcReward" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "fixedAmount" INTEGER,
    "percentage" DOUBLE PRECISION,
    "maxPointsPerTransaction" INTEGER,
    "orgId" UUID NOT NULL,

    CONSTRAINT "LcReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCustomer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "orgId" UUID NOT NULL,

    CONSTRAINT "LoyaltyCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LcReferralCode" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loyaltyCampaignId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "referralCode" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LCampaignRewardEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loyaltyCampaignId" UUID NOT NULL,
    "referrerId" UUID,
    "customerId" UUID,
    "transactionAmount" DOUBLE PRECISION,

    CONSTRAINT "LCampaignRewardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LCustomerRewardEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lCampaignRewardEventId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "pointsEarned" INTEGER NOT NULL,

    CONSTRAINT "LCustomerRewardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCampaign_name_key" ON "LoyaltyCampaign"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCustomer_phone_orgId_key" ON "LoyaltyCustomer"("phone", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCustomer_email_orgId_key" ON "LoyaltyCustomer"("email", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "LcReferralCode_referralCode_key" ON "LcReferralCode"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "LcReferralCode_loyaltyCampaignId_customerId_key" ON "LcReferralCode"("loyaltyCampaignId", "customerId");

-- AddForeignKey
ALTER TABLE "LoyaltyCampaign" ADD CONSTRAINT "LoyaltyCampaign_referrerRewardId_fkey" FOREIGN KEY ("referrerRewardId") REFERENCES "LcReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCampaign" ADD CONSTRAINT "LoyaltyCampaign_userRewardId_fkey" FOREIGN KEY ("userRewardId") REFERENCES "LcReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCampaign" ADD CONSTRAINT "LoyaltyCampaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LcReward" ADD CONSTRAINT "LcReward_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCustomer" ADD CONSTRAINT "LoyaltyCustomer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LcReferralCode" ADD CONSTRAINT "LcReferralCode_loyaltyCampaignId_fkey" FOREIGN KEY ("loyaltyCampaignId") REFERENCES "LoyaltyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LcReferralCode" ADD CONSTRAINT "LcReferralCode_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LcReferralCode" ADD CONSTRAINT "LcReferralCode_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LCampaignRewardEvent" ADD CONSTRAINT "LCampaignRewardEvent_loyaltyCampaignId_fkey" FOREIGN KEY ("loyaltyCampaignId") REFERENCES "LoyaltyCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LCampaignRewardEvent" ADD CONSTRAINT "LCampaignRewardEvent_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LCampaignRewardEvent" ADD CONSTRAINT "LCampaignRewardEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LCustomerRewardEvent" ADD CONSTRAINT "LCustomerRewardEvent_lCampaignRewardEventId_fkey" FOREIGN KEY ("lCampaignRewardEventId") REFERENCES "LCampaignRewardEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LCustomerRewardEvent" ADD CONSTRAINT "LCustomerRewardEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
