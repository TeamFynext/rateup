import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const bySurveyIdParamsSchema = z.object({
  surveyId: z.string(),
});

export const createTestimonialSchama = z.object({
  responseId: z.string(),
  testimonial: z.object({
    questionId: z.string(),
    name: z.string().optional(),
    jobTitle: z.string().optional(),
    testimonial: z.string(),
    rating: z.number().optional(),
    photo: z.string().optional(),
  }),
});
export const { schemas: testimonialSchemas, $ref: $Testimonialref } =
  buildJsonSchemas(
    {
      bySurveyIdParamsSchema,
      createTestimonialSchama,
    },
    { $id: "testimonialSchema" },
  );

export type BySurveyIdParamsInput = z.infer<typeof bySurveyIdParamsSchema>;
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchama>;
