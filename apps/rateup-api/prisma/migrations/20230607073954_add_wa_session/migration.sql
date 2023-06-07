-- CreateEnum
CREATE TYPE "ResponsePlatform" AS ENUM ('WEB', 'WHATSAPP', 'APP');

-- AlterTable
ALTER TABLE "SurveyResponse" ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "platform" "ResponsePlatform" NOT NULL DEFAULT 'WEB',
ALTER COLUMN "language" SET DEFAULT '';

-- CreateTable
CREATE TABLE "WaSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phone" TEXT NOT NULL,
    "surveyId" UUID NOT NULL,
    "currentQuestionId" TEXT NOT NULL,
    "responses" JSONB[],
    "language" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "WaSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaSession_phone_key" ON "WaSession"("phone");

-- AddForeignKey
ALTER TABLE "WaSession" ADD CONSTRAINT "WaSession_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
