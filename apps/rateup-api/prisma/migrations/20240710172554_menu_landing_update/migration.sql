/*
  Warnings:

  - You are about to drop the column `logo` on the `Menu` table. All the data in the column will be lost.
  - You are about to drop the column `websiteText` on the `Menu` table. All the data in the column will be lost.
  - You are about to drop the column `websiteUrl` on the `Menu` table. All the data in the column will be lost.
  - You are about to drop the column `catalogue` on the `MenuLanding` table. All the data in the column will be lost.
  - You are about to drop the column `feedbackPageEnabled` on the `MenuLanding` table. All the data in the column will be lost.
  - You are about to drop the column `headerStyle` on the `MenuLanding` table. All the data in the column will be lost.
  - You are about to drop the column `headerText` on the `MenuLanding` table. All the data in the column will be lost.
  - You are about to drop the column `logoStyles` on the `MenuLanding` table. All the data in the column will be lost.
  - You are about to drop the column `menuPageEnabled` on the `MenuLanding` table. All the data in the column will be lost.
  - You are about to drop the column `otherStyle` on the `MenuLanding` table. All the data in the column will be lost.
  - You are about to drop the column `titleStyle` on the `MenuLanding` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Menu" DROP COLUMN "logo",
DROP COLUMN "websiteText",
DROP COLUMN "websiteUrl";

-- AlterTable
ALTER TABLE "MenuLanding" DROP COLUMN "catalogue",
DROP COLUMN "feedbackPageEnabled",
DROP COLUMN "headerStyle",
DROP COLUMN "headerText",
DROP COLUMN "logoStyles",
DROP COLUMN "menuPageEnabled",
DROP COLUMN "otherStyle",
DROP COLUMN "titleStyle",
ADD COLUMN     "dynamicVariables" JSONB[] DEFAULT ARRAY[]::JSONB[],
ADD COLUMN     "primaryColor" TEXT;
