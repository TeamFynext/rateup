-- CreateTable
CREATE TABLE "LandingPage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "ownerOrgId" UUID NOT NULL,
    "shortUrlId" TEXT NOT NULL,
    "theme" JSONB,
    "links" JSONB,
    "additionalData" JSONB,
    "shareSettings" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_shortUrlId_key" ON "LandingPage"("shortUrlId");

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_ownerOrgId_fkey" FOREIGN KEY ("ownerOrgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
