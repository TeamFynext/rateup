/*
  Warnings:

  - You are about to drop the `LoyaltyApiKey` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LoyaltyApiKey" DROP CONSTRAINT "LoyaltyApiKey_orgId_fkey";

-- DropTable
DROP TABLE "LoyaltyApiKey";

-- CreateTable
CREATE TABLE "ApiAccessToken" (
    "orgId" UUID NOT NULL,
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiAccessToken_orgId_key" ON "ApiAccessToken"("orgId");

-- AddForeignKey
ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
