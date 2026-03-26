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
  link: z.string().optional(),
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

export type updateGenerateQrRecordReqBodyType = z.infer<
  typeof updateGenerateQrRecordReqBody
>;

export {
  generateQrBaseSchema,
  getGenerateQrRecordWithShortIdParams,
  getAllGenerateQrRecordsResponse,
  updateGenerateQrRecordReqBody,
  createGenerateQrRecordReqBody,
  CreateGenerateQrRecordReqBody,
};
