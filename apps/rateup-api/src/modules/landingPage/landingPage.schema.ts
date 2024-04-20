import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const landingPageBaseSchema = z.object({
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

const getLandingPageWithShortIdParams = z.object({
  shortUrlId: z.string(),
});

const createLandingPageReqBody = z.object({
  name: z.string(),
});

const getLandingPagesResponse = z.array(landingPageBaseSchema);

const updateLandingPageReqBody = z.object({
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
  landingPageBaseSchema,
  createLandingPageReqBody,
  getLandingPagesResponse,
  getLandingPageWithShortIdParams,
  updateLandingPageReqBody,
  updatePageVisitsOrLinkClicksReqBody,
  updatePageVisitsOrLinkClicksReqParams,
};

type CreateLandingPageReqBody = z.infer<typeof createLandingPageReqBody>;

const { schemas: landingPageSchemas, $ref: landingPageSchemaRef } =
  buildJsonSchemas(models, { $id: "landingPageSchema" });

export { landingPageSchemas, landingPageSchemaRef, CreateLandingPageReqBody };
