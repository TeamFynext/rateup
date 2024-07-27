import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const linktreeBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  shortUrlId: z.string(),
  theme: z.any(),
  links: z.any(),
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
  links: z.any().optional(),
  shareSettings: z.any().optional(),
  isPublished: z.boolean().optional(),
});

const updatePageVisitsOrLinkClicksReqParams = z.object({
  shortUrlId: z.string(),
});

const updatePageVisitsOrLinkClicksReqBody = z.object({
  resourceToBeUpdated: z.enum(["page-visit", "link-click"]),
  linkId: z.string().optional(),
});

const models = {
  linktreeBaseSchema,
  createLinktreeReqBody,
  getLinktreesResponse,
  getLinktreeWithShortIdParams,
  updateLinktreeReqBody,
  updatePageVisitsOrLinkClicksReqBody,
  updatePageVisitsOrLinkClicksReqParams,
};

type CreateLinktreeReqBody = z.infer<typeof createLinktreeReqBody>;

const { schemas: linktreeSchemas, $ref: linktreeSchemaRef } = buildJsonSchemas(
  models,
  { $id: "linktreeSchema" },
);

export { linktreeSchemas, linktreeSchemaRef, CreateLinktreeReqBody };
