-- Separate "it failed" from "I paused it".
--
-- Every failure path wrote INACTIVE — the same value the pause button writes —
-- so a campaign that fell over on its way out was indistinguishable in the list
-- from one its owner had deliberately stopped, and the reason it recorded was
-- never shown. FAILED is now written instead; this reclassifies the rows that
-- were already stranded.
--
-- An errorMessage is the evidence: nothing sets one when a campaign is paused on
-- purpose, and every failure path sets one.
UPDATE "Campaign"
SET "status" = 'FAILED'
WHERE "status" = 'INACTIVE'
  AND "errorMessage" IS NOT NULL
  AND "errorMessage" <> '';
