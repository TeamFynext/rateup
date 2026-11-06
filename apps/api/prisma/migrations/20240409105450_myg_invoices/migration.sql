-- CreateTable
CREATE TABLE "MyGInvoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceValue" DOUBLE PRECISION NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "invoiceBranch" TEXT NOT NULL,

    CONSTRAINT "MyGInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MyGInvoice_invoiceNumber_mobileNumber_key" ON "MyGInvoice"("invoiceNumber", "mobileNumber");
