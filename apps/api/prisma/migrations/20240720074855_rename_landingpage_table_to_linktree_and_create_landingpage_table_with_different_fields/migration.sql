ALTER TABLE "LandingPage" RENAME TO "Linktree";

-- AlterTable
ALTER TABLE "Linktree" RENAME CONSTRAINT "LandingPage_pkey" TO "Linktree_pkey";

-- RenameForeignKey
ALTER TABLE "Linktree" RENAME CONSTRAINT "LandingPage_createdById_fkey" TO "Linktree_createdById_fkey";

-- RenameForeignKey
ALTER TABLE "Linktree" RENAME CONSTRAINT "LandingPage_ownerOrgId_fkey" TO "Linktree_ownerOrgId_fkey";

-- RenameIndex
ALTER INDEX "LandingPage_shortUrlId_key" RENAME TO "Linktree_shortUrlId_key";

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "ownerOrgId" UUID NOT NULL,
    "shortUrlId" TEXT NOT NULL,
    "tiptapEditorContent" TEXT NOT NULL,
    "visitorsCount" INTEGER NOT NULL DEFAULT 0,
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