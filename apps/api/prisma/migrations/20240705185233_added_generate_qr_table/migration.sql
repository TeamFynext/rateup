-- CreateTable
CREATE TABLE "GenerateQr" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "ownerOrgId" UUID NOT NULL,
    "shortUrlId" TEXT NOT NULL,
    "shareSettings" JSONB,
    "link" TEXT NOT NULL,
    "noOfScans" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GenerateQr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerateQr_shortUrlId_key" ON "GenerateQr"("shortUrlId");

-- AddForeignKey
ALTER TABLE "GenerateQr" ADD CONSTRAINT "GenerateQr_ownerOrgId_fkey" FOREIGN KEY ("ownerOrgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerateQr" ADD CONSTRAINT "GenerateQr_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
