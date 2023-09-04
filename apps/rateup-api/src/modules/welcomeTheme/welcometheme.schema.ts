import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const WelcomeThemeCore = {
  headerText: z.string().optional(),
  descText: z.string().optional(),
  buttonText: z.string().optional(),
  headerStyles: z.any(),
  descStyles: z.any(),
  buttonStyles: z.any(),
  bgStyles: z.any(),
  logoStyles: z.any(),
  surveyId: z.string().optional(),

  bgUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  bgType: z.string().optional(),
};

const updateSurveyRequestSchema = z.object({
  ...WelcomeThemeCore,
});
const createWelcomeThemeRequestSchema = z.object({
  ...WelcomeThemeCore,
});
const createWelcomeThemesurveySchema = z.object({
  headerText: z.string().optional(),
  descText: z.string().optional(),
  buttonText: z.string().optional(),
  headerStyles: z.any(),
  descStyles: z.any(),
  buttonStyles: z.any(),
  bgStyles: z.any(),
  logoStyles: z.any(),
  surveyId: z.string().optional(),

  bgUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  bgType: z.string().optional(),
});
const createWelcomeThemeResponseSchema = z.object({
  ...WelcomeThemeCore,
});

const getWelcomeThemeBySurveyIdParamsSchema = z.object({
  id: z.string(),
});

const getWelcomeThemeByIdParamsSchema = z.object({
  id: z.string(),
});

export const { schemas: WelcomeThemeSchema, $ref: $Sref } = buildJsonSchemas(
  {
    createWelcomeThemeRequestSchema,
    createWelcomeThemeResponseSchema,
    getWelcomeThemeBySurveyIdParamsSchema,
    getWelcomeThemeByIdParamsSchema,
    updateSurveyRequestSchema,
    createWelcomeThemesurveySchema,
  },
  { $id: "WelcomeThemeSchema" }
);

export type CreateWelcomeThemeInput = z.infer<
  typeof createWelcomeThemeRequestSchema
>;
export type GetWelcomeThemeInput = z.infer<
  typeof getWelcomeThemeBySurveyIdParamsSchema
>;
export type updateWelomeTheme = z.infer<typeof updateSurveyRequestSchema>;
export type GetWelomeThemeSurvey = z.infer<
  typeof createWelcomeThemesurveySchema
>;
