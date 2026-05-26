-- CreateTable
CREATE TABLE "PartnerData" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "yearsInBusiness" TEXT NOT NULL,
    "whyPartner" TEXT NOT NULL,
    "services" TEXT[],
    "referralVolume" TEXT NOT NULL,
    "managesClients" TEXT NOT NULL,
    "apiExperience" TEXT NOT NULL,
    "canOnboard" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerData_pkey" PRIMARY KEY ("id")
);
