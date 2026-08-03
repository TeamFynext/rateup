import { z } from "zod";

const linktreeBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  shortUrlId: z.string(),
  theme: z.any(),
  links: z.array(
    z.looseObject({
      id: z.string().optional(),
      noOfClicks: z.number().optional(),
    }),
  ),
  shareSettings: z.any(),
  isPublished: z.boolean(),
  visitorsCount: z.number(),
});

const getLinktreeWithShortIdParams = z.object({
  shortUrlId: z.string(),
});

const createLinktreeReqBody = z.object({
  name: z.string(),
});

const getLinktreesResponse = z.array(linktreeBaseSchema);

const updateLinktreeReqBody = z.object({
  shortUrlId: z.string(),
  name: z.string().optional(),
  theme: z.any().optional(),
  links: z
    .array(
      z.looseObject({
        id: z.string().optional(),
        noOfClicks: z.number().optional(),
      }),
    )
    .optional(),
  shareSettings: z.any().optional(),
  isPublished: z.boolean().optional(),
});

const updatePageVisitsOrLinkClicksReqParams = z.object({
  shortUrlId: z.string(),
});

const byIdParams = z.object({
  // z.guid() rather than z.uuid(): the latter also enforces the RFC version and
  // variant nibbles, which Postgres's uuid type does not, so a legacy id that
  // the database accepts would have been refused here.
  id: z.guid(),
});

const linkTypeParams = z.object({
  linkType: z.enum(["web-survey", "whatsapp-survey"]),
});

const updatePageVisitsOrLinkClicksReqBody = z.object({
  resourceToBeUpdated: z.enum(["page-visit", "link-click"]),
  linkId: z.string().optional(),
});

type CreateLinktreeReqBody = z.infer<typeof createLinktreeReqBody>;
type GetLinktreeWithShortIdParams = z.infer<typeof getLinktreeWithShortIdParams>;
type UpdateLinktreeReqBody = z.infer<typeof updateLinktreeReqBody>;
type UpdatePageVisitsOrLinkClicksReqParams = z.infer<typeof updatePageVisitsOrLinkClicksReqParams>;
type UpdatePageVisitsOrLinkClicksReqBody = z.infer<typeof updatePageVisitsOrLinkClicksReqBody>;

export {
  byIdParams,
  linkTypeParams,
  linktreeBaseSchema,
  createLinktreeReqBody,
  getLinktreesResponse,
  getLinktreeWithShortIdParams,
  updateLinktreeReqBody,
  updatePageVisitsOrLinkClicksReqBody,
  updatePageVisitsOrLinkClicksReqParams,
  CreateLinktreeReqBody,
  GetLinktreeWithShortIdParams,
  UpdateLinktreeReqBody,
  UpdatePageVisitsOrLinkClicksReqParams,
  UpdatePageVisitsOrLinkClicksReqBody,
};
