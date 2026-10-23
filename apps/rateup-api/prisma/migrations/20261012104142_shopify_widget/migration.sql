-- CreateTable
CREATE TABLE "ShopifyWidgetStat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "pageType" TEXT NOT NULL,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopifyWidgetStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyWidgetStat_orgId_date_pageType_key" ON "ShopifyWidgetStat"("orgId", "date", "pageType");

-- AddForeignKey
ALTER TABLE "ShopifyWidgetStat" ADD CONSTRAINT "ShopifyWidgetStat_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
