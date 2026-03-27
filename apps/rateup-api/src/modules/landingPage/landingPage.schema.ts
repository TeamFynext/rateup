import { z } from "zod";

const landingPageBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  shortUrlId: z.string(),
  shareSettings: z.any(),
  isPublished: z.boolean(),
  tiptapEditorContent: z.string(),
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
  shareSettings: z.any().optional(),
  tiptapEditorContent: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const updatePageVisitsReqParams = z.object({
  shortUrlId: z.string(),
});

const deleteLandingPageWithIddParams = z.object({
  id: z.string(),
});

type CreateLandingPageReqBody = z.infer<typeof createLandingPageReqBody>;

export {
  CreateLandingPageReqBody,
  landingPageBaseSchema,
  createLandingPageReqBody,
  getLandingPagesResponse,
  getLandingPageWithShortIdParams,
  updateLandingPageReqBody,
  deleteLandingPageWithIddParams,
  updatePageVisitsReqParams,
};
