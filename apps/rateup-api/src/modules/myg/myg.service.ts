import prisma from "../../utils/prisma";
import { UploadInvoiceSchema } from "./myg.schema";

export async function getInvoiceData() {
  const invoiceCount = await prisma.myGInvoice.count();

  // Return the invoice count
  return `Total: ${invoiceCount} Invoices`;
}

export async function uploadInvoiceData(input: UploadInvoiceSchema) {
  try {
    const successfulInvoices = [];
    const failedInvoices = [];

    for (const invoice of input) {
      try {
        const createdInvoice = await prisma.myGInvoice.create({
          data: {
            invoiceDate: new Date(invoice.invoice_date),
            invoiceNumber: invoice.invoice_number,
            invoiceValue: invoice.invoice_value,
            mobileNumber: invoice.mobile_number.toString(),
            invoiceBranch: invoice.invoice_branch,
            invoiceDiscount: invoice.invoice_discount,
          },
        });
        successfulInvoices.push(createdInvoice);
      } catch (error) {
        if (error.code === "P2002") {
          // Assuming 'P2002' is the error code for unique constraint violation
          failedInvoices.push(invoice);
        } else {
          throw error; // Rethrow if it's a different error
        }
      }
    }

    return `${
      successfulInvoices.length > 0
        ? `Successfully inserted ${successfulInvoices.length} invoices. `
        : ""
    }${
      failedInvoices.length > 0
        ? `Failed to insert ${failedInvoices.length} invoices due to existing similar data`
        : ""
    }`;
  } catch (error) {
    throw error;
  }
}

//MYG
