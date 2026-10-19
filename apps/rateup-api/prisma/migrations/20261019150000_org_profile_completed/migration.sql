-- AlterTable
ALTER TABLE "Org" ADD COLUMN "profileCompletedAt" TIMESTAMP(3);

-- Every org that exists today gave its business details at signup.
UPDATE "Org" SET "profileCompletedAt" = "createdAt";
