/*
  Warnings:

  - You are about to drop the column `labelId` on the `TicketCard` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TicketCard" DROP CONSTRAINT "TicketCard_labelId_fkey";

-- AlterTable
ALTER TABLE "TicketCard" DROP COLUMN "labelId";

-- CreateTable
CREATE TABLE "TicketLabelMap" (
    "cardId" UUID NOT NULL,
    "labelId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketLabelMap_pkey" PRIMARY KEY ("cardId","labelId")
);

-- AddForeignKey
ALTER TABLE "TicketLabelMap" ADD CONSTRAINT "TicketLabelMap_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "TicketCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLabelMap" ADD CONSTRAINT "TicketLabelMap_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "TicketBoardLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
