/*
  Warnings:

  - The values [LOYALTY_REGISTRATION] on the enum `TemplateType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TemplateType_new" AS ENUM ('GENERAL_NOTIFICATION', 'ORDER_DETAILS', 'PAYMENT_CONFIRMATION', 'LOYALTY');
ALTER TABLE "WaTemplate" ALTER COLUMN "templateType" DROP DEFAULT;
ALTER TABLE "WaTemplate" ALTER COLUMN "templateType" TYPE "TemplateType_new" USING ("templateType"::text::"TemplateType_new");
ALTER TYPE "TemplateType" RENAME TO "TemplateType_old";
ALTER TYPE "TemplateType_new" RENAME TO "TemplateType";
DROP TYPE "TemplateType_old";
ALTER TABLE "WaTemplate" ALTER COLUMN "templateType" SET DEFAULT 'GENERAL_NOTIFICATION';
COMMIT;

-- DropForeignKey
ALTER TABLE "LoyaltyActionCustomerMap" DROP CONSTRAINT "LoyaltyActionCustomerMap_actionId_fkey";

-- AddForeignKey
ALTER TABLE "LoyaltyActionCustomerMap" ADD CONSTRAINT "LoyaltyActionCustomerMap_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "LoyaltyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
