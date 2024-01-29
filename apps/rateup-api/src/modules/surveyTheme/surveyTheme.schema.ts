import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const welcomeThemeSchema = z.object({
  bg: z
    .object({
      desktopbg: z.string(),
      mobilebg: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  logo: z
    .object({
      logo: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  title: z
    .object({
      title: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  subtitle: z
    .object({
      subtitle: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  button: z
    .object({
      label: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
});

const surveyThemeSchema = z.object({
  bg: z
    .object({
      desktopbg: z.string(),
      mobilebg: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  title: z
    .object({
      title: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  subtitle: z
    .object({
      subtitle: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  button: z
    .object({
      label: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  input: z
    .object({
      primaryColor: z.string().default("rateup-blue"),
    })
    .optional(),
});

const thankyouThemeSchema = z.object({
  bg: z
    .object({
      desktopbg: z.string(),
      mobilebg: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  logo: z
    .object({
      logo: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  title: z
    .object({
      title: z.string().default("Thank you"),
      styles: z.any().optional(),
    })
    .optional(),
  subtitle: z
    .object({
      subtitle: z.string(),
      styles: z.any().optional(),
    })
    .optional(),
  confettiEnabled: z.boolean().default(false),
});

const surveyThemeSchemaCore = z.object({
  surveyId: z.string().uuid(),
  welcomeTheme: welcomeThemeSchema.optional(),
  surveyTheme: surveyThemeSchema.optional(),
  thankyouTheme: thankyouThemeSchema.optional(),
});

const bySurveyIdSchema = z.object({
  surveyId: z.string().uuid(),
});

const bySurveyThemeIdSchema = z.object({
  surveyThemeId: z.string().uuid(),
});

export const { schemas: surveyThemeSchemas, $ref: $surveyThemeRef } =
  buildJsonSchemas(
    {
      surveyThemeSchemaCore,
      bySurveyIdSchema,
      bySurveyThemeIdSchema,
    },
    {
      $id: "surveyTheme",
    },
  );

export type surveyThemeSchemaCore = z.infer<typeof surveyThemeSchemaCore>;
export type bySurveyIdSchema = z.infer<typeof bySurveyIdSchema>;
export type bySurveyThemeIdSchema = z.infer<typeof bySurveyThemeIdSchema>;
