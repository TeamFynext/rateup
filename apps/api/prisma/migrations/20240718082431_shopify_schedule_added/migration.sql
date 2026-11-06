-- AlterTable
ALTER TABLE "ShopifySurvey" ADD COLUMN     "sendAfter" TEXT;

-- CreateTable
CREATE TABLE "ShopifySurveySchedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "shopifySurveyId" UUID NOT NULL,
    "webhookId" TEXT,
    "status" TEXT DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifySurveySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifySurveySchedule_webhookId_key" ON "ShopifySurveySchedule"("webhookId");

-- AddForeignKey
ALTER TABLE "ShopifySurveySchedule" ADD CONSTRAINT "ShopifySurveySchedule_shopifySurveyId_fkey" FOREIGN KEY ("shopifySurveyId") REFERENCES "ShopifySurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
