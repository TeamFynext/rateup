import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import { questionSchema } from "../question/question.schema";

const surveyCore = {
  title: z.string({
    required_error: "Title is required",
    invalid_type_error: "Title must be a string",
  }),
  languages: z.array(z.string()),
  teamIds: z.array(z.string({ required_error: "TeamId is required" })),
  active: z.boolean().default(true),
  type: z.string().default("web"),
  getLocation: z.boolean().default(false),
  welcomePageEnabled: z.boolean().default(false),
};
const createSurveyRequestSchema = z.object({
  ...surveyCore,
});
const createSurveyLandingRequestSchema = z.object({
  title: z.string({
    required_error: "Title is required",
    invalid_type_error: "Title must be a string",
  }),
  header: z.string({
    required_error: "Header is required",
    invalid_type_error: "Header must be a string",
  }),
  surveys: z.array(z.string()),

});
const createSurveyResponseSchema = z.object({
  ...surveyCore,
  id: z.string(),
});
const createSurveyLandingResponseSchema = z.object({
  title: z.string({
    required_error: "Title is required",
    invalid_type_error: "Title must be a string",
  }),
  header: z.string({
    required_error: "Header is required",
    invalid_type_error: "Header must be a string",
  }),
  surveys: z.array(z.string()),
  id: z.string(),
});
const getSurveyByIdParamsSchema = z.object({
  id: z.string(),
});
const getSurveyLandingByIdParamsSchema = z.object({
  id: z.string(),
});

const idParamsSchema = z.object({
  id: z.string(),
});

const cloneSurveySchema = z.object({
  teamId: z.string().uuid(),
});

const getSurveyPublicResponseSchema = z.object({
  title: z.string(),
  languages: z.array(z.string()),
  active: z.boolean(),
  questions: z.array(questionSchema),
  isProtected: z.boolean(),
  isPublished: z.boolean(),
  type: z.string(),
  kioskMode: z.boolean(),
  getLocation: z.boolean(),
  welcomePageEnabled: z.boolean(),
  orgLogo:z.string(),
});

const updateSurveyRequestSchema = z.object({
  title: z
    .string({
      required_error: "Title is required",
      invalid_type_error: "Title must be a string",
    })
    .optional(),
  languages: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  kioskMode: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  welcomePageEnabled: z.boolean().optional(),
});
const updateLandingPageRequestSchema = z.object({
  title: z
    .string({
      required_error: "Title is required",
      invalid_type_error: "Title must be a string",
    })
    .optional(),
  header: z
    .string({
      required_error: "Header is required",
      invalid_type_error: "Header must be a string",
    })
    .optional(),
  surveys: z.array(z.string()).optional(),
  welcomePageEnabled: z.boolean().default(false).optional(),
 
});

const updateSurveyPasswordRequestSchema = z.object({
  password: z.string({
    required_error: "Password is required",
    invalid_type_error: "Password must be a string",
  }),
});

const updateGoogleLinkRequestSchema = z.object({
  googleLink: z
    .string({
      required_error: "Link is required",
      invalid_type_error: "Link must be a string",
    })
    .min(5, "Invalid link"),
});

export const { schemas: surveySchemas, $ref: $Sref } = buildJsonSchemas(
  {
    createSurveyRequestSchema,
    createSurveyLandingRequestSchema,
    createSurveyResponseSchema,
    createSurveyLandingResponseSchema,
    getSurveyByIdParamsSchema,
    getSurveyLandingByIdParamsSchema,
    updateSurveyRequestSchema,
    getSurveyPublicResponseSchema,
    updateSurveyPasswordRequestSchema,
    idParamsSchema,
    cloneSurveySchema,
    updateGoogleLinkRequestSchema,
  },
  { $id: "surveySchema" }
);

export type CreateSurveyInput = z.infer<typeof createSurveyRequestSchema>;
export type CreateSurveyLandingInput = z.infer<
  typeof createSurveyLandingRequestSchema
>;
export type GetSurveyByIdParams = z.infer<typeof getSurveyByIdParamsSchema>;
export type GetSurveyLandingByIdParams = z.infer<typeof getSurveyLandingByIdParamsSchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveyRequestSchema>;
export type UpdateLandingPageInput = z.infer<typeof updateLandingPageRequestSchema>;
export type UpdateSurveyPassword = z.infer<
  typeof updateSurveyPasswordRequestSchema
>;
export type IdParamInput = z.infer<typeof idParamsSchema>;
export type CloneSurveyInput = z.infer<typeof cloneSurveySchema>;
export type UpdateGoogleLinkInput = z.infer<
  typeof updateGoogleLinkRequestSchema
>;
