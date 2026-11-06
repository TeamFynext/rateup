import { z } from "zod";

const bySurveyIdParamsSchema = z.object({
  surveyId: z.string(),
});

const createTestimonialSchama = z.object({
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

export type BySurveyIdParamsInput = z.infer<typeof bySurveyIdParamsSchema>;
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchama>;

// Auto-exported after fastify-zod migration
export { bySurveyIdParamsSchema, createTestimonialSchama };
