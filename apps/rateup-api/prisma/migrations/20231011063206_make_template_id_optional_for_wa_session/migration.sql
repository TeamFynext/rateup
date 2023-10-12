-- DropForeignKey
ALTER TABLE "WaSession" DROP CONSTRAINT "WaSession_templateId_fkey";

-- AlterTable
ALTER TABLE "WaSession" ALTER COLUMN "templateId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WaSession" ADD CONSTRAINT "WaSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WaTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
