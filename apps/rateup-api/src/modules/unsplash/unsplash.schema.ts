import { z } from "zod";

const getUnsplashImageQueryStringSchema = z.object({
  page: z.coerce.number().int().min(0).max(1000).optional(),
  query: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
const triggerDownloadUnsplashImageSchema = z.object({
  downloadLocation: z.string().max(2048),
});

export type getUnsplashImageQueryString = z.infer<typeof getUnsplashImageQueryStringSchema>;

export type triggerDownloadUnsplashBody = z.infer<typeof triggerDownloadUnsplashImageSchema>;

// Auto-exported after fastify-zod migration
export { getUnsplashImageQueryStringSchema, triggerDownloadUnsplashImageSchema };
