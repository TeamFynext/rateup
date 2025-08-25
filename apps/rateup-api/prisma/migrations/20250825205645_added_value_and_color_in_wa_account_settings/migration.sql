/*
  Warnings:

  - Made the column `contactTags` on table `WaAccountSettings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contactGroupTags` on table `WaAccountSettings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "WaAccountSettings" ALTER COLUMN "contactTags" SET NOT NULL,
ALTER COLUMN "contactTags" SET DEFAULT '[]',
ALTER COLUMN "contactGroupTags" SET NOT NULL,
ALTER COLUMN "contactGroupTags" SET DEFAULT '[]';
