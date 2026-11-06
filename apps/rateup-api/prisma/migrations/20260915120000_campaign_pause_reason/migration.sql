-- Why the platform paused a campaign on its own (conversation allowance spent,
-- or Meta rejected the payment method), and when. Both NULL for every existing
-- row: no campaign was ever paused this way before.

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "pauseReason" TEXT,
ADD COLUMN "pausedAt" TIMESTAMP(3);
