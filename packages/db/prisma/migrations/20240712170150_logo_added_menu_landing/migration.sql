/*
  Warnings:

  - You are about to drop the column `dynamicVariables` on the `MenuLanding` table. All the data in the column will be lost.
  - You are about to drop the column `primaryColor` on the `MenuLanding` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MenuLanding" DROP COLUMN "dynamicVariables",
DROP COLUMN "primaryColor",
ADD COLUMN     "colors" JSONB,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "menuButtons" JSONB[] DEFAULT ARRAY[]::JSONB[];
