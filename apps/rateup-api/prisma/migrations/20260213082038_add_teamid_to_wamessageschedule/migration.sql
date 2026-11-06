-- AlterTable
ALTER TABLE "WaMessageSchedule" ADD COLUMN     "teamId" UUID;

-- AddForeignKey
ALTER TABLE "WaMessageSchedule" ADD CONSTRAINT "WaMessageSchedule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
