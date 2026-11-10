-- Contact identities, contract step: Contact."phone", "email", "bsuid", "igsId" and "psid"
-- were mirrors of the contact's primary identity of each kind (20261105100000). The code now
-- reads them from "ContactIdentity" (apps/api/src/modules/contact/identity/contactFields.ts),
-- so the columns go. Before they do, every value still only in a column is copied into an
-- identity, so a database whose identity backfill never ran (or was stopped) loses nothing.
--
-- Same rules as identitiesFromContact() in identity.service.ts:
--   PHONE     the digits of "phone", when they are 7-15 digits and "phone" is not a BSUID or
--             the contact's own Instagram/Messenger id (older paths stored those there).
--   EMAIL     lower(trim("email")).
--   WA_BSUID  "bsuid", or "phone" when it holds a BSUID.
--   IG_SCOPED "igsId";  FB_PSID "psid", or "other" on a Messenger contact without one.
--   WEBCHAT   "other" on a webchat contact: the widget's visitor id (sometimes a typed phone,
--             which stays unverified). Older contacts only got this identity from a new message.
--   Channel unknown for the last three, so scope "" (attachIdentity takes the channel on the
--   next message). "other" itself stays: the widget still finds its visitor through it.
-- A value another contact already holds (any scope) is not copied: identities belong to one
-- contact. Phones and platform ids were unique per org, so that can only be an email shared
-- by two contacts; the pair is raised as a SAME_EMAIL merge suggestion for someone to look at.

-- Fail rather than queue every Contact query behind a long transaction.
SET lock_timeout = '10s';

-- 1. Copy the column values that have no identity yet.
CREATE TEMP TABLE "_legacy_contact_identity" AS
SELECT c."orgId", c."id" AS "contactId", c."createdAt", v."kind", v."value", v."verified", v."username"
FROM "Contact" c
CROSS JOIN LATERAL (
  VALUES
    (
      'PHONE'::"ContactIdentityKind",
      CASE
        WHEN NULLIF(trim(c."phone"), '') IS NULL THEN NULL
        WHEN c."phone" ~ '^[A-Z]{2}\.(ENT\.)?[A-Za-z0-9]{1,128}$' THEN NULL
        WHEN c."phone" = c."igsId" OR c."phone" = c."psid" THEN NULL
        WHEN regexp_replace(c."phone", '\D', '', 'g') ~ '^[0-9]{7,15}$'
          THEN regexp_replace(c."phone", '\D', '', 'g')
      END,
      false,
      NULL::text
    ),
    ('EMAIL'::"ContactIdentityKind", NULLIF(lower(trim(c."email")), ''), false, NULL::text),
    (
      'WA_BSUID'::"ContactIdentityKind",
      COALESCE(
        NULLIF(trim(c."bsuid"), ''),
        CASE WHEN c."phone" ~ '^[A-Z]{2}\.(ENT\.)?[A-Za-z0-9]{1,128}$' THEN c."phone" END
      ),
      true,
      c."whatsappUserName"
    ),
    ('IG_SCOPED'::"ContactIdentityKind", NULLIF(trim(c."igsId"), ''), true, NULL::text),
    (
      'FB_PSID'::"ContactIdentityKind",
      COALESCE(
        NULLIF(trim(c."psid"), ''),
        CASE WHEN c."source" = 'FACEBOOK' THEN NULLIF(trim(c."other"), '') END
      ),
      true,
      NULL::text
    ),
    (
      'WEBCHAT'::"ContactIdentityKind",
      CASE WHEN c."source" = 'WEBCHAT' THEN NULLIF(trim(c."other"), '') END,
      false,
      NULL::text
    )
) AS v("kind", "value", "verified", "username")
WHERE v."value" IS NOT NULL;

-- One holder per value: the oldest contact, as an identity can belong to only one.
INSERT INTO "ContactIdentity"
  ("orgId", "contactId", "kind", "scope", "value", "source", "verified", "isPrimary", "username")
SELECT DISTINCT ON (l."orgId", l."kind", l."value")
  l."orgId", l."contactId", l."kind", '', l."value", 'IMPORT', l."verified",
  NOT EXISTS (
    SELECT 1 FROM "ContactIdentity" p
    WHERE p."contactId" = l."contactId" AND p."kind" = l."kind" AND p."isPrimary"
  ),
  l."username"
FROM "_legacy_contact_identity" l
WHERE NOT EXISTS (
  SELECT 1 FROM "ContactIdentity" i
  WHERE i."orgId" = l."orgId" AND i."kind" = l."kind" AND i."value" = l."value"
)
ORDER BY l."orgId", l."kind", l."value", l."createdAt", l."contactId";

-- 2. A column value now held by another contact: suggest merging the two.
INSERT INTO "ContactMergeSuggestion" ("orgId", "contactAId", "contactBId", "reason", "detail")
SELECT DISTINCT ON (l."orgId", LEAST(l."contactId", i."contactId"), GREATEST(l."contactId", i."contactId"))
  l."orgId",
  LEAST(l."contactId", i."contactId"),
  GREATEST(l."contactId", i."contactId"),
  CASE l."kind" WHEN 'EMAIL' THEN 'SAME_EMAIL' WHEN 'WEBCHAT' THEN 'CUSTOMER_PROVIDED' ELSE 'SAME_PHONE' END,
  l."value"
FROM "_legacy_contact_identity" l
JOIN "ContactIdentity" i
  ON i."orgId" = l."orgId" AND i."kind" = l."kind" AND i."value" = l."value"
 AND i."contactId" <> l."contactId"
WHERE NOT EXISTS (
  SELECT 1 FROM "ContactIdentity" own
  WHERE own."contactId" = l."contactId" AND own."kind" = l."kind" AND own."value" = l."value"
)
ON CONFLICT ("orgId", "contactAId", "contactBId") DO NOTHING;

DROP TABLE "_legacy_contact_identity";

-- 3. Exactly one primary per contact and kind: keep the oldest primary, and promote the
--    oldest identity where a kind has none (a merge or removal left it without one).
UPDATE "ContactIdentity" i SET "isPrimary" = false
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "contactId", "kind" ORDER BY "createdAt", "id") AS rn
  FROM "ContactIdentity" WHERE "isPrimary"
) d
WHERE i."id" = d."id" AND d.rn > 1;

UPDATE "ContactIdentity" i SET "isPrimary" = true
FROM (
  SELECT DISTINCT ON ("contactId", "kind") "id"
  FROM "ContactIdentity" x
  WHERE NOT EXISTS (
    SELECT 1 FROM "ContactIdentity" p
    WHERE p."contactId" = x."contactId" AND p."kind" = x."kind" AND p."isPrimary"
  )
  ORDER BY "contactId", "kind", "createdAt", "id"
) first
WHERE i."id" = first."id";

-- CreateIndex
CREATE UNIQUE INDEX "ContactIdentity_one_primary_per_kind" ON "ContactIdentity"("contactId", "kind") WHERE ("isPrimary");

-- DropIndex
DROP INDEX "Contact_orgId_email_idx";

-- DropIndex
DROP INDEX "Contact_phone_orgId_key";

-- DropIndex
DROP INDEX "Contact_igsId_orgId_key";

-- DropIndex
DROP INDEX "Contact_psid_orgId_key";

-- DropIndex
DROP INDEX "Contact_bsuid_orgId_key";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "bsuid",
DROP COLUMN "email",
DROP COLUMN "igsId",
DROP COLUMN "phone",
DROP COLUMN "psid";
