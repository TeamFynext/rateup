/*
  Warnings:

  - The `attachments` column on the `TicketCard` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "TicketCard" DROP COLUMN "attachments",
ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
