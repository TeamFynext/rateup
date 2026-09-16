-- Loyalty member cards: each member gets a QR code the cashier scans in the mobile app.
--
-- `cardCode` is what the QR encodes (twelve characters from the till-code alphabet, so it
-- can also be typed). It stays NULL for members enrolled before this shipped until a card
-- is first sent to them, which is what keeps them out of the automatic first-message send.
-- `cardSentAt` records the last delivery Meta accepted. The PNG is rendered on demand from
-- the code, so nothing else is stored.

ALTER TABLE "CustomerLoyaltyAccount"
  ADD COLUMN "cardCode" TEXT,
  ADD COLUMN "cardSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CustomerLoyaltyAccount_cardCode_key" ON "CustomerLoyaltyAccount"("cardCode");
