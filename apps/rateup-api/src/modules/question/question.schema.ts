import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { QuestionType } from "../../types/enums";


const questionCore = {
  title: z.record(z.string(), z.string()),
  description: z.record(z.string(), z.string()),
  required: z.boolean().default(false),
  type: z.nativeEnum(QuestionType),
  choices: z.record(z.string(), z.array(z.string())).optional(),
  logic: z.record(z.union([z.string(), z.number(), z.array(z.string())]), z.string()).optional(),
};

export const questionSchema = z.object({
  ...questionCore,
  id: z.string(),
});

const createQuestionRequestSchema = z.object({
  ...questionCore,
  // Allow to create a question at a specific position
  // Should be index of the question in the array (0 based)
  position: z.number().optional(),
});
const createQuestionResponseSchema = z.object({
  ...questionCore,
  id: z.string(),
});

const questionsRouteParamsSchema = z.object({
  surveyId: z.string(),
});

/**  For routes that concerns a single question */
const questionRouteParamsSchema = z.object({
  surveyId: z.string(),
  id: z.string(),
});

// making everything optional
const updateQuestionRequestSchema = z.object({
  ...questionCore,
  title: z.record(z.string(), z.string()).optional(),
  description: z.record(z.string(), z.string()).optional(),
  required: z.boolean().optional(),
  // Type cannot be changed. Throws error if 'type' is provided
  type: z.never().optional()
});

const updateQuestionsOrderRequestSchema = z.array(z.string());

export const { schemas: questionSchemas, $ref: $Qref } = buildJsonSchemas(
  {
    createQuestionRequestSchema,
    createQuestionResponseSchema,
    updateQuestionsOrderRequestSchema,
    updateQuestionRequestSchema,
    questionRouteParamsSchema,
    questionsRouteParamsSchema,
  },
  { $id: "questionSchema" }
);
export type CreateQuestionInput = z.infer<typeof createQuestionRequestSchema>;
export type UpdateQuestionsOrderInput = z.infer<
  typeof updateQuestionsOrderRequestSchema
>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionRequestSchema>;
export type QuestionRouteParams = z.infer<typeof questionRouteParamsSchema>;
export type QuestionsRouteParams = z.infer<typeof questionsRouteParamsSchema>;
