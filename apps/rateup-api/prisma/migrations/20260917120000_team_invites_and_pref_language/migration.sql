-- Invitations carry what the inviter chose — a role and one or more teams — and the
-- language a person picks is kept on their account rather than only in a cookie.

-- The role an invitee is given on accept. NULL on existing rows, which accept reads as ADMIN.

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "role" "Role";

-- Every team an invitee joins on accept. teamId remains the team the invitation is filed
-- under; empty here, as on every existing row, means teamId alone.

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "teamIds" UUID[] DEFAULT ARRAY[]::UUID[];

-- prefLanguage is now written by the language switcher, which deals in ISO codes, and read
-- back to pick the UI language on a new browser. Existing rows hold names no locale matches.

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "prefLanguage" SET DEFAULT 'en';

-- Anything unrecognised is left alone; the clients read it as "no preference".
UPDATE "User" SET "prefLanguage" = 'en' WHERE lower("prefLanguage") IN ('english', 'en-us', 'en-gb');
UPDATE "User" SET "prefLanguage" = 'ar' WHERE lower("prefLanguage") = 'arabic';
UPDATE "User" SET "prefLanguage" = 'de' WHERE lower("prefLanguage") IN ('german', 'deutsch');
UPDATE "User" SET "prefLanguage" = 'fr' WHERE lower("prefLanguage") IN ('french', 'francais', 'français');
UPDATE "User" SET "prefLanguage" = 'hi' WHERE lower("prefLanguage") = 'hindi';
