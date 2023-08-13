import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { LogicAction, LogicCondition, QuestionType } from "../../types/enums";


export const logicConditionSchema = z.nativeEnum(LogicCondition)

const logicJumpSchema = z.object({
  condition: logicConditionSchema,
  response: z.any(),
  action: z.string()
})

const questionCore = {
  title: z.record(z.string(), z.string()),
  description: z.record(z.string(), z.string()),
  required: z.boolean().default(false),
  type: z.nativeEnum(QuestionType),
  choices: z.record(z.string(), z.array(z.string())).optional(),
  googleReview: z.union([z.null(), z.object({
    minRating: z.number().optional(),
    minOpinion: z.number().optional(),
    reqOptions: z.array(z.string()).optional(),
  })]).optional(),
  logic: z.array(logicJumpSchema).optional()
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
  type: z.never().optional(),
  logic: z.any().optional(), //TODO
  googleReview: z.union([z.null(), z.object({
    minRating: z.number().optional(),
    minOpinion: z.number().optional(),
    reqOptions: z.array(z.string()).optional(),
  })]).optional(),
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
