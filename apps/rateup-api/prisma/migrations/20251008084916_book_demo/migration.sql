-- CreateTable
CREATE TABLE "public"."BookDemo" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "teamSize" TEXT NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "primaryUseCase" TEXT NOT NULL,
    "additionalInfo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookDemo_pkey" PRIMARY KEY ("id")
);
