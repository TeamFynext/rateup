/*
  Warnings:

  - Added the required column `userEmail` to the `GoogleAccessToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GoogleAccessToken" ADD COLUMN     "userEmail" TEXT NOT NULL;
