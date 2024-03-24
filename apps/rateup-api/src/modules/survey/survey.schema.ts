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
  templateId: z.string().optional(),
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

const getSurveyTemplatesParamsSchema = z.object({
  surveyType: z.string(),
});

const deleteTeamSurveyRequestSchema = z.object({
  teamId: z.string().uuid(),
});

const idParamsSchema = z.object({
  id: z.string(),
});

const cloneSurveySchema = z.object({
  teamIds: z.array(z.string().uuid()),
});

const getSurveyPublicResponseSchema = z.object({
  id: z.string(),
  surveyTeamMapId: z.string(),
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
  orgLogo: z.string(),
  skipPreview: z.boolean(),
  isEncrypted: z.boolean(),
  enableTickets: z.boolean(),
  enableTicketEmailAlerts: z.boolean(),
  publicKey: z.string().optional(),
  redirect: z
    .object({
      url: z.string().optional(),
      time: z.string().optional(),
      enable: z.boolean().default(false),
    })
    .optional(),
});

const updateSurveyRequestSchema = z.object({
  title: z
    .string({
      required_error: "Title is required",
      invalid_type_error: "Title must be a string",
    })
    .optional(),
  languages: z.array(z.string()).optional(),
  teams: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  kioskMode: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  welcomePageEnabled: z.boolean().optional(),
  skipPreview: z.boolean().optional(),
  getLocation: z.boolean().optional(),
  enableNotificationEmail: z.boolean().optional(),
  notificationEmail: z.string().email().optional(),
  isEncrypted: z.boolean().optional(),
  enableTickets: z.boolean().optional(),
  enableTicketEmailAlerts: z.boolean().optional(),
  publicKey: z.string().optional(),
  redirect: z
    .object({
      url: z.string().optional(),
      time: z.string().optional(),
      enable: z.boolean().default(false),
    })
    .optional(),
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
    createSurveyLandingResponseSchema,
    getSurveyByIdParamsSchema,
    getSurveyTemplatesParamsSchema,
    getSurveyLandingByIdParamsSchema,
    updateSurveyRequestSchema,
    getSurveyPublicResponseSchema,
    updateSurveyPasswordRequestSchema,
    idParamsSchema,
    cloneSurveySchema,
    updateGoogleLinkRequestSchema,
    deleteTeamSurveyRequestSchema,
  },
  { $id: "surveySchema" },
);

export type CreateSurveyInput = z.infer<typeof createSurveyRequestSchema>;
export type CreateSurveyLandingInput = z.infer<
  typeof createSurveyLandingRequestSchema
>;
export type GetSurveyTemplatesParams = z.infer<
  typeof getSurveyTemplatesParamsSchema
>;
export type GetSurveyByIdParams = z.infer<typeof getSurveyByIdParamsSchema>;
export type GetSurveyLandingByIdParams = z.infer<
  typeof getSurveyLandingByIdParamsSchema
>;
export type UpdateSurveyInput = z.infer<typeof updateSurveyRequestSchema>;
export type UpdateLandingPageInput = z.infer<
  typeof updateLandingPageRequestSchema
>;
export type UpdateSurveyPassword = z.infer<
  typeof updateSurveyPasswordRequestSchema
>;
export type DeleteTeamSurveyInput = z.infer<
  typeof deleteTeamSurveyRequestSchema
>;
export type IdParamInput = z.infer<typeof idParamsSchema>;
export type CloneSurveyInput = z.infer<typeof cloneSurveySchema>;
export type UpdateGoogleLinkInput = z.infer<
  typeof updateGoogleLinkRequestSchema
>;
