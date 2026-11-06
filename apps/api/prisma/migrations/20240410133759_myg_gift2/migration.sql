-- AlterTable
ALTER TABLE "MyGInvoice" ADD COLUMN     "gift" TEXT,
ADD COLUMN     "giftRedeemed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "redeemAttempt" INTEGER NOT NULL DEFAULT 0;
