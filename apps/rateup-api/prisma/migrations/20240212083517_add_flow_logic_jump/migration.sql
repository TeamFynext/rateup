-- AlterTable
ALTER TABLE "WaFlow" ADD COLUMN     "logicJumps" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "WhatsappSettings" ADD COLUMN     "encryption" JSONB;
