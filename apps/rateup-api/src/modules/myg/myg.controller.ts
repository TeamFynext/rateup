import { FastifyReply, FastifyRequest } from "fastify";
import { uploadInvoiceData } from "./myg.service";
import { UploadInvoiceSchema } from "./myg.schema";

export async function uploadInvoiceDataHandler(
  request: FastifyRequest<{
    Body: UploadInvoiceSchema;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;

  try {
    const invoices = await uploadInvoiceData(body);
    console.log(invoices);
    reply.status(201).send(invoices);
  } catch (e) {
    reply.status(500).send({ status: "failed", message: e.message });
  }
}

//MYG
