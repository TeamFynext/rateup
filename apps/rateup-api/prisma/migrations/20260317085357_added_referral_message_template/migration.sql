-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "referralMessageTemplate" JSONB NOT NULL DEFAULT '[{"type": "paragraph","content": [{"type": "text","text": "🎉 Welcome {{1}}!\nYou are now registered in our Loyalty Program.\n🔗 Your referral code: {{2}}\nShare & earn rewards"}]}]';
