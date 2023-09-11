/*
  Warnings:

  - You are about to drop the column `whatsappAccessToken` on the `Team` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "whatsappAccessToken" TEXT;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "whatsappAccessToken";
