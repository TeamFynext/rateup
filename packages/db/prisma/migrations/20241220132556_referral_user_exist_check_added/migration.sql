-- AlterEnum
ALTER TYPE "TemplateType" ADD VALUE 'LOYALTY_REGISTRATION';

-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "isExistingUserReferralAllowed" BOOLEAN DEFAULT false;
