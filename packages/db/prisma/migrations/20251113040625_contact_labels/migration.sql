-- CreateTable
CREATE TABLE "public"."ContactLabel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3b82f6',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgId" UUID NOT NULL,

    CONSTRAINT "ContactLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactLabelMap" (
    "contactId" UUID NOT NULL,
    "labelId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactLabelMap_pkey" PRIMARY KEY ("contactId","labelId")
);

-- CreateIndex
CREATE INDEX "ContactLabel_orgId_idx" ON "public"."ContactLabel"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactLabel_name_orgId_key" ON "public"."ContactLabel"("name", "orgId");

-- CreateIndex
CREATE INDEX "ContactLabelMap_contactId_idx" ON "public"."ContactLabelMap"("contactId");

-- CreateIndex
CREATE INDEX "ContactLabelMap_labelId_idx" ON "public"."ContactLabelMap"("labelId");

-- AddForeignKey
ALTER TABLE "public"."ContactLabel" ADD CONSTRAINT "ContactLabel_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactLabelMap" ADD CONSTRAINT "ContactLabelMap_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactLabelMap" ADD CONSTRAINT "ContactLabelMap_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "public"."ContactLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
