import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const LandingThemeCore = {
  headerText: z.string().optional(),
  descText: z.string().optional(),
  buttonText: z.string().optional(),
  headerStyles: z.any(),
  descStyles: z.any(),
  buttonStyles: z.any(),
  bgStyles: z.any(),
  logoStyles: z.any(),
  landingId: z.string().optional(),

  bgUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  bgType: z.string().optional(),
};

const updateLandingThemeRequestSchema = z.object({
  ...LandingThemeCore,
});

const createLandingThemeRequestSchema = z.object({
  ...LandingThemeCore,
});

const createLandingThemesurveySchema = z.object({
  headerText: z.string().optional(),
  descText: z.string().optional(),
  buttonText: z.string().optional(),
  headerStyles: z.any(),
  descStyles: z.any(),
  buttonStyles: z.any(),
  bgStyles: z.any(),
  logoStyles: z.any(),
  landingId: z.string().optional(),

  bgUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  bgType: z.string().optional(),
});
const createLandingThemeResponseSchema = z.object({
  ...LandingThemeCore,
});

const getLandingThemeBySurveyIdParamsSchema = z.object({
  id: z.string(),
});

const getLandingThemeByIdParamsSchema = z.object({
  id: z.string(),
});

export const { schemas: LandingThemeSchema, $ref: $Sref } = buildJsonSchemas(
  {
    createLandingThemeRequestSchema,
    createLandingThemeResponseSchema,
    getLandingThemeBySurveyIdParamsSchema,
    getLandingThemeByIdParamsSchema,
    updateLandingThemeRequestSchema,
    createLandingThemesurveySchema,
  },
  { $id: "LandingThemeSchema" }
);

export type CreateLandingThemeInput = z.infer<
  typeof createLandingThemeResponseSchema
>;
export type GetLandingThemeInput = z.infer<
  typeof getLandingThemeByIdParamsSchema
>;
export type updateLandingTheme = z.infer<typeof updateLandingThemeRequestSchema>;

export type GetLandingThemeSurvey = z.infer<
  typeof createLandingThemesurveySchema
>;
