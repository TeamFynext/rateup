import { z } from "zod";

const getUnsplashImageQueryStringSchema = z.object({
  page: z.number().optional(),
  query: z.string().trim().optional(),
  limit: z.number().optional(),
});
const triggerDownloadUnsplashImageSchema = z.object({
  downloadLocation: z.string(),
});

export type getUnsplashImageQueryString = z.infer<
  typeof getUnsplashImageQueryStringSchema
>;

export type triggerDownloadUnsplashBody = z.infer<
  typeof triggerDownloadUnsplashImageSchema
>;

// Auto-exported after fastify-zod migration
export {
  getUnsplashImageQueryStringSchema,
  triggerDownloadUnsplashImageSchema,
};
