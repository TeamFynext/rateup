-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "driveFolderId" TEXT;

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "spreadSheetId" TEXT;

-- CreateTable
CREATE TABLE "GoogleAccessToken" (
    "accessToken" TEXT NOT NULL,
    "orgId" UUID NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "scopes" TEXT[]
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccessToken_orgId_key" ON "GoogleAccessToken"("orgId");

-- AddForeignKey
ALTER TABLE "GoogleAccessToken" ADD CONSTRAINT "GoogleAccessToken_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
