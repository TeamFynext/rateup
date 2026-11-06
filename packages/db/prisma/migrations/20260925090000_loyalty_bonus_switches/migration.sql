-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "referralBonusEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "signupBonusEnabled" BOOLEAN NOT NULL DEFAULT true;
