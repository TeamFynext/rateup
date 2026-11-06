-- DropForeignKey
ALTER TABLE "LoyaltyCustomer" DROP CONSTRAINT "LoyaltyCustomer_contactId_fkey";

-- AddForeignKey
ALTER TABLE "LoyaltyCustomer" ADD CONSTRAINT "LoyaltyCustomer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
