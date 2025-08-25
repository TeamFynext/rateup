/*
  Warnings:

  - The `contactTags` column on the `WaAccountSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `contactGroupTags` column on the `WaAccountSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "WaAccountSettings"
    ALTER COLUMN "contactTags" DROP DEFAULT,
    ALTER COLUMN "contactGroupTags" DROP DEFAULT;

ALTER TABLE "WaAccountSettings"
    ALTER COLUMN "contactTags" TYPE jsonb
    USING to_jsonb("contactTags"),
    ALTER COLUMN "contactGroupTags" TYPE jsonb
    USING to_jsonb("contactGroupTags");
