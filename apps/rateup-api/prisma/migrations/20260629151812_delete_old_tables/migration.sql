/*
  Warnings:

  - The values [digital_menu] on the enum `TeamFeature` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `LandingPage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Menu` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuBanner` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuLanding` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TeamFeature_new" AS ENUM ('inbox', 'analytics', 'contacts', 'campaigns', 'flows', 'chatbots', 'templates', 'automation', 'loyalty', 'web_forms', 'tickets', 'qr_studio', 'ai_chatbot', 'apps_services', 'settings');
ALTER TABLE "TeamFeatureAccess" ALTER COLUMN "feature" TYPE "TeamFeature_new" USING ("feature"::text::"TeamFeature_new");
ALTER TYPE "TeamFeature" RENAME TO "TeamFeature_old";
ALTER TYPE "TeamFeature_new" RENAME TO "TeamFeature";
DROP TYPE "public"."TeamFeature_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "LandingPage" DROP CONSTRAINT "LandingPage_createdById_fkey";

-- DropForeignKey
ALTER TABLE "LandingPage" DROP CONSTRAINT "LandingPage_ownerOrgId_fkey";

-- DropForeignKey
ALTER TABLE "Menu" DROP CONSTRAINT "Menu_teamId_fkey";

-- DropForeignKey
ALTER TABLE "MenuBanner" DROP CONSTRAINT "MenuBanner_menuId_fkey";

-- DropForeignKey
ALTER TABLE "MenuCategory" DROP CONSTRAINT "MenuCategory_menuId_fkey";

-- DropForeignKey
ALTER TABLE "MenuItem" DROP CONSTRAINT "MenuItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "MenuLanding" DROP CONSTRAINT "MenuLanding_menuId_fkey";

-- DropForeignKey
ALTER TABLE "MenuLanding" DROP CONSTRAINT "MenuLanding_surveyTeamMapId_fkey";

-- DropTable
DROP TABLE "LandingPage";

-- DropTable
DROP TABLE "Menu";

-- DropTable
DROP TABLE "MenuBanner";

-- DropTable
DROP TABLE "MenuCategory";

-- DropTable
DROP TABLE "MenuItem";

-- DropTable
DROP TABLE "MenuLanding";
