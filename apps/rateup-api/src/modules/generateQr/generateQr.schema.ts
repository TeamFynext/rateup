import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const generateQrBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  shortUrlId: z.string(),
  shareSettings: z.any(),
  noOfScans: z.number(),
  link: z.string(),
});

const getGenerateQrRecordWithShortIdParams = z.object({
  shortUrlId: z.string(),
});

const createGenerateQrRecordReqBody = z.object({
  name: z.string(),
  link: z.string(),
});

const getAllGenerateQrRecordsResponse = z.array(generateQrBaseSchema);

const updateGenerateQrRecordReqBody = z.object({
  shortUrlId: z.string(),
  name: z.string().optional(),
  shareSettings: z.any().optional(),
});

const models = {
  generateQrBaseSchema,
  createGenerateQrRecordReqBody,
  getGenerateQrRecordWithShortIdParams,
  getAllGenerateQrRecordsResponse,
  updateGenerateQrRecordReqBody,
};

type CreateGenerateQrRecordReqBody = z.infer<
  typeof createGenerateQrRecordReqBody
>;

const { schemas: generateQrSchemas, $ref: generateQrSchemaRef } =
  buildJsonSchemas(models, { $id: "generateQrSchema" });

export {
  generateQrSchemas,
  generateQrSchemaRef,
  CreateGenerateQrRecordReqBody,
};
