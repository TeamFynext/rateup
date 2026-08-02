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

// link is the address a scanner's browser is sent to, and it was a bare
// z.string() on both writers — so the API accepted `javascript:alert(1)`,
// `data:text/html,...` and the empty string, and served them from an
// unauthenticated endpoint to whoever scanned the code. See issues.txt 44.1.
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
  // Repointing a printed code is the point of a dynamic QR; accepting an
  // unparseable value for it is not. See issues.txt 44.1.
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
