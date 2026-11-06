-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shopifyPlanId" TEXT;

-- CreateTable
CREATE TABLE "jobQueue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobQueue_pkey" PRIMARY KEY ("id")
);
