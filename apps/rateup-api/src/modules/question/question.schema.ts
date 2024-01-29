import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { LogicCondition, NPSWeightage, QuestionType } from "../../types/enums";

export const logicConditionSchema = z.nativeEnum(LogicCondition);

const logicJumpSchema = z.object({
  condition: logicConditionSchema,
  response: z.any(),
  action: z.string(),
});

const validationRulesSchema = z.object({
  length: z
    .object({
      min: z.string(),
      max: z.string(),
      errorMessage: z.string(),
    })
    .optional(),
  wordCount: z
    .object({
      min: z.string(),
      max: z.string(),
      errorMessage: z.string(),
    })
    .optional(),
  textType: z
    .union([
      z.null(),
      z.object({
        type: z.string(),
        errorMessage: z.string(),
      }),
    ])
    .optional(),
});

const questionCore = {
  title: z.record(z.string(), z.string()),
  description: z.record(z.string(), z.string()),
  required: z.boolean().default(false),
  type: z.nativeEnum(QuestionType),
  choices: z
    .record(
      z.string(),
      z.array(
        z.object({
          value: z.union([
            z.string(),
            z.object({
              value: z.string(),
              image: z.string(),
            }),
          ]),
          weightage: z.nativeEnum(NPSWeightage).optional(),
        }),
      ),
    )
    .optional(),
  features: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  sections: z
    .record(
      z.string(),
      z.array(
        z.object({
          title: z.string(),
          rows: z.array(
            z.object({
              title: z.string(),
              description: z.string().optional(),
            }),
          ),
        }),
      ),
    )
    .optional(),
  googleReview: z
    .union([
      z.null(),
      z.object({
        minRating: z.number().optional(),
        minOpinion: z.number().optional(),
        reqOptions: z.array(z.string()).optional(),
      }),
    ])
    .optional(),
  logic: z.array(logicJumpSchema).optional(),
  validationRules: z.union([z.null(), validationRulesSchema]).optional(),
  tnc: z
    .record(
      z.object({
        title: z.string(),
        urlTitle: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
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

const updateQuestionRequestSchema = z.object({
  ...questionCore,
  title: z.record(z.string(), z.string()).optional(),
  description: z.record(z.string(), z.string()).optional(),
  required: z.boolean().optional(),
  // Type cannot be changed. Throws error if 'type' is provided
  type: z.never().optional(),
  logic: z.any().optional(), //TODO
  googleReview: z
    .union([
      z.null(),
      z.object({
        minRating: z.number().optional(),
        minOpinion: z.number().optional(),
        reqOptions: z.array(z.string()).optional(),
      }),
    ])
    .optional(),
  validationRules: z.union([z.null(), validationRulesSchema]).optional(),
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
  { $id: "questionSchema" },
);
export type CreateQuestionInput = z.infer<typeof createQuestionRequestSchema>;
export type UpdateQuestionsOrderInput = z.infer<
  typeof updateQuestionsOrderRequestSchema
>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionRequestSchema>;
export type QuestionRouteParams = z.infer<typeof questionRouteParamsSchema>;
export type QuestionsRouteParams = z.infer<typeof questionsRouteParamsSchema>;
