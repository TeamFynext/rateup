/*
  Warnings:

  - You are about to drop the column `labels` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `inboxLabels` on the `WaAccountSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "labels";

-- AlterTable
ALTER TABLE "WaAccountSettings" DROP COLUMN "inboxLabels";

-- CreateTable
CREATE TABLE "Labels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactLabelMap" (
    "contactId" UUID NOT NULL,
    "labelId" UUID NOT NULL,

    CONSTRAINT "ContactLabelMap_pkey" PRIMARY KEY ("contactId","labelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Labels_name_key" ON "Labels"("name");

-- AddForeignKey
ALTER TABLE "Labels" ADD CONSTRAINT "Labels_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLabelMap" ADD CONSTRAINT "ContactLabelMap_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLabelMap" ADD CONSTRAINT "ContactLabelMap_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
