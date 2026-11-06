-- CreateTable
CREATE TABLE "Referral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referral_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "signup_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referral_code_key" ON "Referral"("referral_code");
