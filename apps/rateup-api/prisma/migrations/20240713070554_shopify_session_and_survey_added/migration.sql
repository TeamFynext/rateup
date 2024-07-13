-- CreateTable
CREATE TABLE "ShopifySession" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL,
    "scope" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "orgId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isWebhookRegistered" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ShopifySurvey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID,
    "orgId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isProductSpecific" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT,
    "event" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "teamId" UUID NOT NULL,
    "waTemplateId" UUID,

    CONSTRAINT "ShopifySurvey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifySession_id_key" ON "ShopifySession"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifySession_shop_key" ON "ShopifySession"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifySurvey_orgId_event_shop_key" ON "ShopifySurvey"("orgId", "event", "shop");

-- AddForeignKey
ALTER TABLE "ShopifySession" ADD CONSTRAINT "ShopifySession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifySurvey" ADD CONSTRAINT "ShopifySurvey_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifySurvey" ADD CONSTRAINT "ShopifySurvey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifySurvey" ADD CONSTRAINT "ShopifySurvey_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifySurvey" ADD CONSTRAINT "ShopifySurvey_waTemplateId_fkey" FOREIGN KEY ("waTemplateId") REFERENCES "WaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
