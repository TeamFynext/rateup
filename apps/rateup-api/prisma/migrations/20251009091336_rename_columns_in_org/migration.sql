/*
  Warnings:

  - You are about to drop the column `isTellUsMoreCompleted` on the `Org` table. All the data in the column will be lost.
  - You are about to drop the column `tellUsMore` on the `Org` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Org" DROP COLUMN "isTellUsMoreCompleted",
DROP COLUMN "tellUsMore",
ADD COLUMN     "onboarding" JSONB,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
