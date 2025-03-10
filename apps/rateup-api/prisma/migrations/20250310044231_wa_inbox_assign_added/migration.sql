-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "waMessageAssignStatus" TEXT NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "WaInboxAssign" (
    "contactId" UUID NOT NULL,
    "assignedUserId" UUID NOT NULL,
    "teamId" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WaInboxAssign_contactId_assignedUserId_key" ON "WaInboxAssign"("contactId", "assignedUserId");

-- AddForeignKey
ALTER TABLE "WaInboxAssign" ADD CONSTRAINT "WaInboxAssign_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaInboxAssign" ADD CONSTRAINT "WaInboxAssign_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaInboxAssign" ADD CONSTRAINT "WaInboxAssign_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
