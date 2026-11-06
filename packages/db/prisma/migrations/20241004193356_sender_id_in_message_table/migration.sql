-- AlterTable
ALTER TABLE "WaMessage" ADD COLUMN     "sendBy" UUID;

-- AddForeignKey
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_sendBy_fkey" FOREIGN KEY ("sendBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
