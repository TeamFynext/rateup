/*
  Warnings:

  - You are about to drop the column `shortUrlId` on the `Org` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Org_shortUrlId_key";

-- AlterTable
ALTER TABLE "Org" DROP COLUMN "shortUrlId";

-- CreateTable
CREATE TABLE "Chatbot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "shortUrlId" TEXT NOT NULL,
    "publicPageStatus" TEXT DEFAULT 'INACTIVE',

    CONSTRAINT "Chatbot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Chatbot_orgId_key" ON "Chatbot"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Chatbot_shortUrlId_key" ON "Chatbot"("shortUrlId");

-- AddForeignKey
ALTER TABLE "Chatbot" ADD CONSTRAINT "Chatbot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
