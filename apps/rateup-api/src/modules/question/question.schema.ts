import { z } from "zod";
import { LogicCondition, NPSWeightage, PageType, QuestionType } from "../../types/enums.js";

export const logicConditionSchema = z.enum(LogicCondition);

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
  label: z.record(z.string(), z.string()).optional(),
  required: z.boolean().default(false),
  enableNpsAnalytics: z.boolean().default(false),
  type: z.enum(QuestionType).or(z.enum(PageType)),
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
            z.object({
              title: z.string(),
              description: z.string().optional(),
              metadata: z.string().optional(),
              image: z.string().optional(),
            }),
          ]),
          weightage: z.enum(NPSWeightage).optional(),
        }),
      ),
    )
    .optional(),
  features: z.record(z.string(), z.record(z.string(), z.any())).optional(),
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
  ticketIssue: z
    .union([
      z.null(),
      z.object({
        minRating: z.number().optional(),
        minOpinion: z.number().optional(),
        reqOptions: z.array(z.string()).optional(),
        selectedColumnId: z.string().optional(),
        selectedBoardId: z.string().optional(),
      }),
    ])
    .optional(),
  logic: z.array(logicJumpSchema).optional(),
  validationRules: z.union([z.null(), validationRulesSchema, z.any()]).optional(),
  tnc: z
    .record(
      z.string(),
      z.object({
        title: z.string(),
        urlTitle: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  wop: z
    .object({
      imageSrc: z.string().optional(),
      primaryColor: z.string(),
      primaryColoraround: z.string(),
      contrastColor: z.string(),
      size: z.number(),
      segments: z.array(z.string()),
      segColors: z.array(z.string()),
    })
    .optional(),
  extraConfig: z.any().optional(),
  reviewPageOptions: z
    .union([
      z.null(),
      z.object({
        minRating: z.number().optional(),
        minOpinion: z.number().optional(),
        reqOptions: z.array(z.string()).optional(),
        customPlatformName: z.string().optional(),
      }),
    ])
    .optional(),
  reviewPagePlatform: z.string().optional(),
  // For PageType Question objects like welcome, language, thankyoupage,
  subtitleText: z.string().optional(),
  titleText: z.string().optional(),
  startButtonText: z.string().optional(),
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
  label: z.record(z.string(), z.string()).optional(),
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
  ticketIssue: z
    .union([
      z.null(),
      z.object({
        minRating: z.number().optional(),
        minOpinion: z.number().optional(),
        reqOptions: z.array(z.string()).optional(),
        submissionTicket: z.boolean().optional(),
        selectedColumnId: z.string().optional(),
        selectedBoardId: z.string().optional(),
      }),
    ])
    .optional(),
  validationRules: z.union([z.null(), validationRulesSchema, z.any()]).optional(),
  optinScreenId: z.string().optional(),
  onSelectAction: z.boolean().optional(),
  waAppName: z.string().optional(),
  responseSummary: z
    .object({
      all: z.object({
        responseIds: z.array(z.string()),
        summary: z.string(),
      }),
      team: z.array(
        z.object({
          teamId: z.string(),
          summary: z.string(),
          reponseIds: z.array(z.string()),
        }),
      ),
    })
    .optional(),

  // For PageType Question objects like welcome, language, thankyoupage,
  subtitleText: z.string().optional(),
  titleText: z.string().optional(),
  startButtonText: z.string().optional(),
});

const updateQuestionsOrderRequestSchema = z.array(z.string());

const replaceQuestionsRequestSchema = z.object({
  questions: z.array(z.looseObject({ id: z.string().min(1) })).max(500),
  screenId: z.string().min(1).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionRequestSchema>;
export type UpdateQuestionsOrderInput = z.infer<typeof updateQuestionsOrderRequestSchema>;
export type ReplaceQuestionsInput = z.infer<typeof replaceQuestionsRequestSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionRequestSchema>;
export type QuestionRouteParams = z.infer<typeof questionRouteParamsSchema>;
export type QuestionsRouteParams = z.infer<typeof questionsRouteParamsSchema>;

// Auto-exported after fastify-zod migration
export {
  replaceQuestionsRequestSchema,
  createQuestionRequestSchema,
  createQuestionResponseSchema,
  updateQuestionsOrderRequestSchema,
  updateQuestionRequestSchema,
  questionRouteParamsSchema,
  questionsRouteParamsSchema,
};
