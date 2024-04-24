/*
  Warnings:

  - You are about to drop the column `waContactId` on the `WaMessage` table. All the data in the column will be lost.
  - You are about to drop the `WaContact` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WaContact" DROP CONSTRAINT "WaContact_contactId_fkey";

-- DropForeignKey
ALTER TABLE "WaContact" DROP CONSTRAINT "WaContact_orgId_fkey";

-- DropForeignKey
ALTER TABLE "WaMessage" DROP CONSTRAINT "WaMessage_waContactId_fkey";

-- AlterTable
ALTER TABLE "WaMessage" DROP COLUMN "waContactId";

-- DropTable
DROP TABLE "WaContact";
