-- CreateTable
CREATE TABLE "OtpStore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "surveyId" TEXT,

    CONSTRAINT "OtpStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OtpStore_userId_key" ON "OtpStore"("userId");
