-- Invitations carry what the inviter chose — a role and one or more teams — and the
-- language a person picks is kept on their account rather than only in a cookie.

-- The role an invitee is given when they accept, chosen by whoever invited them.
-- NULL for every existing invitation: until now the accept path created every team
-- invitee as ADMIN regardless, and it still does when this column is NULL.

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "role" "Role";

-- Every team an invitee joins on accept. teamId remains the team the invitation is
-- filed under (the [email, teamId] unique constraint and Team.invitations are keyed on
-- it); this column carries the full set when more than one team was chosen.
-- Empty for every existing invitation, which accept reads as "teamId only".

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "teamIds" UUID[] DEFAULT ARRAY[]::UUID[];

-- prefLanguage is now written by the language switcher, which deals in ISO codes, and is
-- read back to pick the UI language on a new browser. Existing rows hold the signup-time
-- default "English" (and a handful of other names), which no locale file matches.

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "prefLanguage" SET DEFAULT 'en';

-- Normalise the names already stored. Anything unrecognised is left alone; the clients
-- treat a value they cannot map as "no preference" and fall back to the browser.
UPDATE "User" SET "prefLanguage" = 'en' WHERE lower("prefLanguage") IN ('english', 'en-us', 'en-gb');
UPDATE "User" SET "prefLanguage" = 'ar' WHERE lower("prefLanguage") = 'arabic';
UPDATE "User" SET "prefLanguage" = 'de' WHERE lower("prefLanguage") IN ('german', 'deutsch');
UPDATE "User" SET "prefLanguage" = 'fr' WHERE lower("prefLanguage") IN ('french', 'francais', 'français');
UPDATE "User" SET "prefLanguage" = 'hi' WHERE lower("prefLanguage") = 'hindi';
