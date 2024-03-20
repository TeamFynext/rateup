-- CreateTable
CREATE TABLE "WaContact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" UUID NOT NULL,
    "orgId" UUID NOT NULL,

    CONSTRAINT "WaContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waContactId" UUID NOT NULL,
    "messageBody" JSONB NOT NULL,

    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaContact_contactId_key" ON "WaContact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "WaContact_contactId_orgId_key" ON "WaContact"("contactId", "orgId");

-- AddForeignKey
ALTER TABLE "WaContact" ADD CONSTRAINT "WaContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaContact" ADD CONSTRAINT "WaContact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_waContactId_fkey" FOREIGN KEY ("waContactId") REFERENCES "WaContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
