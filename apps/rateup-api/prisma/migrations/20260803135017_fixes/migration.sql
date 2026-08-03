-- AlterTable
ALTER TABLE "CustomerLoyaltyAccount" ADD COLUMN     "lastBirthdayGreetedAt" TIMESTAMP(3),
ADD COLUMN     "lastInactivityReminderAt" TIMESTAMP(3);
