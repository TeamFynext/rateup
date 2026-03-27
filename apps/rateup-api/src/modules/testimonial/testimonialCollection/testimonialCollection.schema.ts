import { z } from "zod";

const byIdParamsSchema = z.object({
  id: z.string(),
});
const testimonialCollectionQuerySchema = z.object({
  teamId: z.string().optional(),
});
const createTestimonialCollectionSchema = z.object({
  name: z.string(),
  theme: z
    .object({
      root: z.object({
        bg: z.string(),
      }),
      profileBlock: z.object({
        bg: z.string(),
        profileName: z.any(),
        profilePos: z.any(),
        profilePic: z.any(),
      }),
      descBlock: z.object({
        bg: z.string(),
        desc: z.any(),
      }),
      ratingBlock: z.any(),
      date: z.any(),
      layout: z.string(),
    })
    .optional(),
  teamId: z.string(),
});

const updateTestimonialCollectionSchema = z.object({
  name: z.string().optional(),
  testimonialIds: z.array(z.string()).optional(),
  theme: z
    .object({
      root: z.object({
        bg: z.string(),
      }),
      profileBlock: z.object({
        bg: z.string(),
        profileName: z.any(),
        profilePos: z.any(),
        profilePic: z.any(),
      }),
      descBlock: z.object({
        bg: z.string(),
        desc: z.any(),
      }),
      ratingBlock: z.any(),
      date: z.any(),
      layout: z.string(),
    })
    .optional(),
});

//the below  schemas is used to create a collection of testimonials in testimonialCollectionMap table
const MultipleTestimonialToCollectionSchema = z.object({
  testimonialIds: z.array(z.string()),
});

export type ByCollectionIdParamsInput = z.infer<typeof byIdParamsSchema>;
export type CreateTestimonialCollectionInput = z.infer<
  typeof createTestimonialCollectionSchema
>;
export type TestimonialCollectionQuery = z.infer<
  typeof testimonialCollectionQuerySchema
>;
export type UpdateTestimonialCollectionInput = z.infer<
  typeof updateTestimonialCollectionSchema
>;

//the below type is used to add multiple testimonials to a collection
export type MultipleTestimonialToCollectionInput = z.infer<
  typeof MultipleTestimonialToCollectionSchema
>;

// Auto-exported after fastify-zod migration
export {
  byIdParamsSchema,
  createTestimonialCollectionSchema,
  testimonialCollectionQuerySchema,
  updateTestimonialCollectionSchema,
  MultipleTestimonialToCollectionSchema,
};
