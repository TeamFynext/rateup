-- CreateTable
CREATE TABLE "MetaAssets" (
    "orgId" UUID NOT NULL,
    "pages" JSONB[],
    "adAccounts" JSONB[],
    "leads" JSONB[],
    "leadgenForms" JSONB[]
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaAssets_orgId_key" ON "MetaAssets"("orgId");

-- AddForeignKey
ALTER TABLE "MetaAssets" ADD CONSTRAINT "MetaAssets_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
