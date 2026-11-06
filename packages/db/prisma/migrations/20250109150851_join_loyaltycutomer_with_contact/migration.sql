/*
  Warnings:

  - You are about to drop the column `email` on the `LoyaltyCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `LoyaltyCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `LoyaltyCustomer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[contactId]` on the table `LoyaltyCustomer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contactId` to the `LoyaltyCustomer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContactGroupType" AS ENUM ('NORMAL', 'LOYALTY');

-- DropIndex
DROP INDEX "LoyaltyCustomer_phone_orgId_key";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "ContactGroup" ADD COLUMN     "type" "ContactGroupType" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "LoyaltyCustomer" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "contactId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "LoyaltyCustomerMap" (
    "loyaltyCustomerId" UUID NOT NULL,
    "contactGroupId" UUID NOT NULL,

    CONSTRAINT "LoyaltyCustomerMap_pkey" PRIMARY KEY ("loyaltyCustomerId","contactGroupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCustomer_contactId_key" ON "LoyaltyCustomer"("contactId");

-- AddForeignKey
ALTER TABLE "LoyaltyCustomer" ADD CONSTRAINT "LoyaltyCustomer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCustomerMap" ADD CONSTRAINT "LoyaltyCustomerMap_loyaltyCustomerId_fkey" FOREIGN KEY ("loyaltyCustomerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCustomerMap" ADD CONSTRAINT "LoyaltyCustomerMap_contactGroupId_fkey" FOREIGN KEY ("contactGroupId") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
