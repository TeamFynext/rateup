-- CreateEnum
CREATE TYPE "AssignType" AS ENUM ('me', 'staff');

-- DropForeignKey
ALTER TABLE "WaAutomatedReply" DROP CONSTRAINT "WaAutomatedReply_whatsappSettingsPhoneId_fkey";

-- AlterTable
ALTER TABLE "WaAutomatedReply" ADD COLUMN     "other" JSONB,
ADD COLUMN     "teamId" UUID;

-- CreateTable
CREATE TABLE "WaAutomatedReplyAssignedUser" (
    "waAutomatedReplyId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "WaAutomatedReplyAssignedUser_pkey" PRIMARY KEY ("waAutomatedReplyId","userId")
);

-- AddForeignKey
ALTER TABLE "WaAutomatedReply" ADD CONSTRAINT "WaAutomatedReply_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaAutomatedReplyAssignedUser" ADD CONSTRAINT "WaAutomatedReplyAssignedUser_waAutomatedReplyId_fkey" FOREIGN KEY ("waAutomatedReplyId") REFERENCES "WaAutomatedReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaAutomatedReplyAssignedUser" ADD CONSTRAINT "WaAutomatedReplyAssignedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
