-- AlterTable
ALTER TABLE "TicketCard" ADD COLUMN     "labelId" UUID;

-- CreateTable
CREATE TABLE "TicketBoardLabel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "ticketBoardId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketBoardLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketBoardLabel_ticketBoardId_name_key" ON "TicketBoardLabel"("ticketBoardId", "name");

-- AddForeignKey
ALTER TABLE "TicketBoardLabel" ADD CONSTRAINT "TicketBoardLabel_ticketBoardId_fkey" FOREIGN KEY ("ticketBoardId") REFERENCES "TicketBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCard" ADD CONSTRAINT "TicketCard_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "TicketBoardLabel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
