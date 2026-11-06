-- AlterTable
ALTER TABLE "LoyaltyAction" ADD COLUMN     "isAmountBasedForReferee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPointsForReferee" INTEGER;
