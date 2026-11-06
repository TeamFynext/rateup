/*
  Warnings:

  - Added the required column `features` to the `RateupPlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RateupPlan" ADD COLUMN     "features" JSONB;
