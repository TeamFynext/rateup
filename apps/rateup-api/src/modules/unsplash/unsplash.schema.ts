import { z } from "zod";

const getUnsplashImageQueryStringSchema = z.object({
  page: z.coerce.number().optional(),
  query: z.string().trim().optional(),
  limit: z.coerce.number().optional(),
});
const triggerDownloadUnsplashImageSchema = z.object({
  downloadLocation: z.string(),
});

export type getUnsplashImageQueryString = z.infer<typeof getUnsplashImageQueryStringSchema>;

export type triggerDownloadUnsplashBody = z.infer<typeof triggerDownloadUnsplashImageSchema>;

// Auto-exported after fastify-zod migration
export { getUnsplashImageQueryStringSchema, triggerDownloadUnsplashImageSchema };
