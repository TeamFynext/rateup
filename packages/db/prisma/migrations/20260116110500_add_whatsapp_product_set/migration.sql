-- CreateTable
CREATE TABLE "WhatsappProductSet" (
    "productSetId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" UUID NOT NULL,
    "filter" JSONB,
    "productIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappProductSet_pkey" PRIMARY KEY ("productSetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappProductSet_productSetId_key" ON "WhatsappProductSet"("productSetId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappProductSet_orgId_productSetId_key" ON "WhatsappProductSet"("orgId", "productSetId");

-- CreateIndex
CREATE INDEX "WhatsappProductSet_catalogId_idx" ON "WhatsappProductSet"("catalogId");

-- AddForeignKey
ALTER TABLE "WhatsappProductSet" ADD CONSTRAINT "WhatsappProductSet_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "WhatsappCatalog"("catalogId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappProductSet" ADD CONSTRAINT "WhatsappProductSet_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
