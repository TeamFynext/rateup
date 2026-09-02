import { z } from "zod";

import { questionSchema } from "../question/question.schema.js";

const surveyCore = {
  title: z.string({
    error: (issue) => (issue.input === undefined ? "Title is required" : "Title must be a string"),
  }),
  languages: z.array(z.string()),
  teamIds: z.array(
    z.string({
      error: (issue) => (issue.input === undefined ? "TeamId is required" : undefined),
    }),
  ),
  active: z.boolean().default(true),
  type: z.string().default("web"),
  getLocation: z.boolean().default(false),
  welcomePageEnabled: z.boolean().default(false),
};
const createSurveyRequestSchema = z.object({
  ...surveyCore,
  templateId: z.string().optional(),
  selectedTheme: z.string().optional(),
});
const createSurveyLandingRequestSchema = z.object({
  title: z.string({
    error: (issue) => (issue.input === undefined ? "Title is required" : "Title must be a string"),
  }),
  header: z.string({
    error: (issue) =>
      issue.input === undefined ? "Header is required" : "Header must be a string",
  }),
  surveys: z.array(z.string()),
});
const createSurveyLandingResponseSchema = z.object({
  title: z.string({
    error: (issue) => (issue.input === undefined ? "Title is required" : "Title must be a string"),
  }),
  header: z.string({
    error: (issue) =>
      issue.input === undefined ? "Header is required" : "Header must be a string",
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
  teamId: z.uuid(),
});

const phoneParamsSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, {
      error: "Phone number must be at least 10 digits",
    })
    .max(10, {
      error: "Phone number must not exceed 10 digits",
    })
    .refine((value) => /^[+]?[0-9]+$/.test(value), {
      error: "Must be a valid number",
    }),
});

const idParamsSchema = z.object({
  id: z.string(),
});

const cloneSurveySchema = z.object({
  teamIds: z.array(z.uuid()),
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
  uniqueDeviceResponse: z.boolean(),
  type: z.string(),
  kioskMode: z.boolean(),
  getLocation: z.boolean(),
  welcomePageEnabled: z.boolean(),
  orgLogo: z.string(),
  skipPreview: z.boolean(),
  isEncrypted: z.boolean(),
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
      error: (issue) =>
        issue.input === undefined ? "Title is required" : "Title must be a string",
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
  notificationEmail: z.email().optional(),
  isEncrypted: z.boolean().optional(),
  uniqueDeviceResponse: z.boolean().optional(),
  webSurveyAutoTransitionToNextQues: z.boolean().optional(),
  publicKey: z.string().optional(),
  redirect: z
    .object({
      url: z.string().optional(),
      time: z.string().optional(),
      enable: z.boolean().default(false),
    })
    .optional(),
  surveyPublishAt: z.string().nullable().optional(),
  surveyEndAt: z.string().nullable().optional(),
  uiTextTranslations: z.any().optional(),
  webSurveyPagesTheme: z.any().optional(),
  responseWebhookEndpoint: z.string().optional(),
  sendWeeklyReport: z.boolean().optional(),
});
const updateLandingPageRequestSchema = z.object({
  title: z
    .string({
      error: (issue) =>
        issue.input === undefined ? "Title is required" : "Title must be a string",
    })
    .optional(),
  header: z
    .string({
      error: (issue) =>
        issue.input === undefined ? "Header is required" : "Header must be a string",
    })
    .optional(),
  surveys: z.array(z.string()).optional(),
  welcomePageEnabled: z.boolean().default(false).optional(),
});

const updateSurveyPasswordRequestSchema = z.object({
  password: z.string({
    error: (issue) =>
      issue.input === undefined ? "Password is required" : "Password must be a string",
  }),
});

const updateGoogleLinkRequestSchema = z.object({
  googleLink: z
    .string({
      error: (issue) => (issue.input === undefined ? "Link is required" : "Link must be a string"),
    })
    .min(5, "Invalid link"),
});

const surveyVariableSchema = z.object({
  name: z.string().trim().min(1, "Variable name cannot be blank"),
  value: z.string().trim().min(1, "Variable value cannot be blank"),
  type: z.string().trim().min(1, "Variable type cannot be blank"),
});

const surveyVariableUpdateSchema = z.object({
  name: z.string().optional(),
  value: z.string().optional(),
});

const graphResponseParamsSchema = z.object({
  timePeriod: z.string(),
  userTimeZone: z.string(),
  surveyId: z.string().optional(),
  teamMapIds: z.string().optional(),
});

export type PhoneParamInput = z.infer<typeof phoneParamsSchema>;

export type CreateSurveyInput = z.infer<typeof createSurveyRequestSchema>;
export type CreateSurveyLandingInput = z.infer<typeof createSurveyLandingRequestSchema>;
export type GetSurveyTemplatesParams = z.infer<typeof getSurveyTemplatesParamsSchema>;
export type GetSurveyByIdParams = z.infer<typeof getSurveyByIdParamsSchema>;
export type GetSurveyLandingByIdParams = z.infer<typeof getSurveyLandingByIdParamsSchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveyRequestSchema>;
export type UpdateLandingPageInput = z.infer<typeof updateLandingPageRequestSchema>;
export type UpdateSurveyPassword = z.infer<typeof updateSurveyPasswordRequestSchema>;
export type DeleteTeamSurveyInput = z.infer<typeof deleteTeamSurveyRequestSchema>;
export type IdParamInput = z.infer<typeof idParamsSchema>;
export type CloneSurveyInput = z.infer<typeof cloneSurveySchema>;
export type UpdateGoogleLinkInput = z.infer<typeof updateGoogleLinkRequestSchema>;
export type surveyVariableInput = z.infer<typeof surveyVariableSchema>;

export type surveyVariableUpdateInput = z.infer<typeof surveyVariableUpdateSchema>;
export type GraphResponseParams = z.infer<typeof graphResponseParamsSchema>;

// Auto-exported after fastify-zod migration
export {
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
  phoneParamsSchema,
  surveyVariableSchema,
  surveyVariableUpdateSchema,
  graphResponseParamsSchema,
};
