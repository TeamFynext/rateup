import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
export enum QuestionType {
  Rating = "rating",
  Smiley = "smiley",
  LD = "like or dislike",
  YN = "yes or no",
  Opinion = "opinion scale",
  ThankYou = "thank you",
  Email = "email",
  MCQ = "multiple choice",
  MSQ = "multiple select",
  OTP = "otp",
  Phone = "phone number",
  Photo = "photo capture",
  Testimonial = "testimonial",
  Text = "text",
}
const questionCore = {
  surveyId: z.string(),
  title: z.record(z.string(), z.string()),
  description: z.record(z.string(), z.string()).optional(),
  order: z.number(),
  required: z.boolean().optional(),
  type: z.nativeEnum(QuestionType),
  choices: z.record(z.string(), z.array(z.string())).optional(),
};

const createQuestionRequestSchema = z.object({
  ...questionCore,
});
const createQuestionResponseSchema = z.object({
  ...questionCore,
  id: z.string(),
});
const questionIdParamsSchema = z.object({
  id: z.string(),
});

// making everything optional
const updateQuestionRequestSchema = z.object({
  ...questionCore,
  surveyId: z.string().optional(),
  title: z.record(z.string(), z.string()).optional(),
  order: z.number().optional(),
  type: z.nativeEnum(QuestionType).optional(),
});

const updateQuestionsOrderRequestSchema = z.array(z.string());

export const { schemas: questionSchemas, $ref: $Qref } = buildJsonSchemas(
  {
    createQuestionRequestSchema,
    createQuestionResponseSchema,
    questionIdParamsSchema,
    updateQuestionsOrderRequestSchema,
    updateQuestionRequestSchema
  },
  { $id: "questionSchema" }
);
export type CreateQuestionInput = z.infer<typeof createQuestionRequestSchema>;
export type QuestionIdParams = z.infer<typeof questionIdParamsSchema>;
export type UpdateQuestionsOrderInput = z.infer<typeof updateQuestionsOrderRequestSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionRequestSchema>;
