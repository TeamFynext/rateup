import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const getUnsplashImageQueryStringSchema = z.object({
  page: z.number().optional(),
  query: z.string().optional(),
  limit: z.number().optional(),
});

export const { schemas: unsplashSchemas, $ref: $Uref } = buildJsonSchemas(
  {
    getUnsplashImageQueryStringSchema,
  },
  { $id: "unsplashSchema" }
);

export type getUnsplashImageQueryString = z.infer<
  typeof getUnsplashImageQueryStringSchema
>;
