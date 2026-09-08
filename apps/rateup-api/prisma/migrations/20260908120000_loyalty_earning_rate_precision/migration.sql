-- Earning rate precision: points per currency unit, six decimal places.
--
-- Merchants define the rate as "spend X, earn Y" and the editors store Y / X in
-- `pointsPerUnit`. At two decimal places that division lies: "₹150 = 1 point" is
-- 0.006667 and would be stored as 0.01 — half again as generous — and "₹250 = 1
-- point" would be stored as 0.00, earning nothing at all. Six places is exact for
-- any pair a merchant would type, and the engine still floors the final points.
--
-- Widening a NUMERIC keeps every existing value as it is.

ALTER TABLE "LoyaltyEarningRule"
  ALTER COLUMN "pointsPerUnit" TYPE DECIMAL(12, 6);
