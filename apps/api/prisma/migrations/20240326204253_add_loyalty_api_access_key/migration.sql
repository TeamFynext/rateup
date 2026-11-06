-- CreateTable
CREATE TABLE "LoyaltyApiKey" (
    "orgId" UUID NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyApiKey_orgId_key" ON "LoyaltyApiKey"("orgId");

-- AddForeignKey
ALTER TABLE "LoyaltyApiKey" ADD CONSTRAINT "LoyaltyApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
