-- Backfills the WhatsApp tier gates onto subscriptions written before they existed.
--
-- canAccess() reads a gate's `active` flag, and campaigns/loyalty were repointed from
-- `whatsapp.active` to `whatsapp.campaign` / `whatsapp.loyalty`. Without this backfill
-- every subscription already in the wild has no such key, and every org currently
-- paying for campaigns and loyalty would lose them the moment this deploys.
--
-- Existing orgs inherit `whatsapp.active`, i.e. they keep exactly what they have.
-- Only rows missing the key are touched, so this is idempotent and never overrides a
-- deliberate `false` (which is how the Free tier is written).
UPDATE "Subscription"
SET features = jsonb_set(
      features::jsonb,
      '{whatsapp}',
      (features::jsonb -> 'whatsapp')
        || jsonb_build_object(
             'campaign',  jsonb_build_object('active', COALESCE(features::jsonb -> 'whatsapp' -> 'campaign'  -> 'active', features::jsonb -> 'whatsapp' -> 'active', 'true'::jsonb)),
             'loyalty',   jsonb_build_object('active', COALESCE(features::jsonb -> 'whatsapp' -> 'loyalty'   -> 'active', features::jsonb -> 'whatsapp' -> 'active', 'true'::jsonb)),
             'referrals', jsonb_build_object('active', COALESCE(features::jsonb -> 'whatsapp' -> 'referrals' -> 'active', features::jsonb -> 'whatsapp' -> 'active', 'true'::jsonb)),
             'catalog',   jsonb_build_object('active', COALESCE(features::jsonb -> 'whatsapp' -> 'catalog'   -> 'active', features::jsonb -> 'whatsapp' -> 'active', 'true'::jsonb))
           ),
      true
    )
WHERE jsonb_typeof(features::jsonb -> 'whatsapp') = 'object'
  AND NOT (features::jsonb -> 'whatsapp' ?& array['campaign', 'loyalty', 'referrals', 'catalog']);

-- Reputation management is no longer offered. Dropping the key is cosmetic (readers
-- ignore it), but it keeps stored blobs matching the current schema.
UPDATE "Subscription"
SET features = (features::jsonb - 'reputationManagement')
WHERE features::jsonb ? 'reputationManagement';
