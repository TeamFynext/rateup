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

const targetLink = z
  .url()
  .max(2048)
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    error: "link must be an http or https URL",
  });

const createGenerateQrRecordReqBody = z.object({
  name: z.string().min(1).max(200),
  link: targetLink,
});

const getAllGenerateQrRecordsResponse = z.array(generateQrBaseSchema);

const updateGenerateQrRecordReqBody = z.object({
  shortUrlId: z.string(),
  name: z.string().min(1).max(200).optional(),
  shareSettings: z.any().optional(),
  link: targetLink.optional(),
});

type CreateGenerateQrRecordReqBody = z.infer<typeof createGenerateQrRecordReqBody>;

export type updateGenerateQrRecordReqBodyType = z.infer<typeof updateGenerateQrRecordReqBody>;

export type GetGenerateQrRecordWithShortIdParams = z.infer<
  typeof getGenerateQrRecordWithShortIdParams
>;

export {
  generateQrBaseSchema,
  getGenerateQrRecordWithShortIdParams,
  getAllGenerateQrRecordsResponse,
  updateGenerateQrRecordReqBody,
  createGenerateQrRecordReqBody,
  CreateGenerateQrRecordReqBody,
};
