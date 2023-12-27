-- AlterTable
ALTER TABLE "WaSession" ADD COLUMN     "ip" TEXT;

-- CreateTable
CREATE TABLE "Temporary_Tokenization" (
    "token" UUID NOT NULL DEFAULT gen_random_uuid(),
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Temporary_Tokenization_pkey" PRIMARY KEY ("token")
);
