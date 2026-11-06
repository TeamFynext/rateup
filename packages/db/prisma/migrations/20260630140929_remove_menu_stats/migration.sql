/*
  Warnings:

  - You are about to drop the column `allowedMenuViews` on the `UsageStats` table. All the data in the column will be lost.
  - You are about to drop the column `allowedMenus` on the `UsageStats` table. All the data in the column will be lost.
  - You are about to drop the column `menuViewsCount` on the `UsageStats` table. All the data in the column will be lost.
  - You are about to drop the column `menusCount` on the `UsageStats` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyMenuViews` on the `UsageStats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UsageStats" DROP COLUMN "allowedMenuViews",
DROP COLUMN "allowedMenus",
DROP COLUMN "menuViewsCount",
DROP COLUMN "menusCount",
DROP COLUMN "monthlyMenuViews";
