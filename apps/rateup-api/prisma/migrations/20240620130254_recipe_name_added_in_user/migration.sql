-- CreateEnum
CREATE TYPE "UserRecipes" AS ENUM ('EmailPassword', 'ThirdPartyGoogle', 'PasswordLess');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "recipeName" "UserRecipes";
