import { z } from "zod";

const welcomeThemeSchema = z.object({
  bg: z
    .object({
      desktopbg: z.string(),
      mobilebg: z.string(),
      styles: z.any().optional(),
      unsplashImage: z
        .object({
          mobile: z.boolean().optional(),
          desktop: z.boolean().optional(),
        })
        .optional()
        .nullable(),
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
      position: z
        .object({
          x: z.any().optional(),
          y: z.any().optional(),
        })
        .optional(),
    })
    .optional(),
});

const surveyThemeSchema = z.object({
  bg: z
    .object({
      desktopbg: z.string(),
      mobilebg: z.string(),
      styles: z.any().optional(),
      unsplashImage: z
        .object({
          mobile: z.boolean().optional(),
          desktop: z.boolean().optional(),
        })
        .optional()
        .nullable(),
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
  orgLogoEnabled: z.boolean().default(true),
});

const thankyouThemeSchema = z.object({
  bg: z
    .object({
      desktopbg: z.string(),
      mobilebg: z.string(),
      styles: z.any().optional(),
      unsplashImage: z
        .object({
          mobile: z.boolean().optional(),
          desktop: z.boolean().optional(),
        })
        .optional()
        .nullable(),
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
  surveyId: z.uuid(),
  welcomeTheme: welcomeThemeSchema.optional(),
  surveyTheme: surveyThemeSchema.optional(),
  thankyouTheme: thankyouThemeSchema.optional(),
});

// Not one route in this module declared a schema — the theme JSON written by the
// update endpoint and the body spread by the rename endpoint were both entirely
// unconstrained. The four page schemas above describe the theme's SHAPE, but
// they describe the LEGACY shape: they expect `bg.desktopbg` as a string, while
// defaultTheme.ts seeds `bg.desktopBg` as an object. Attaching them would reject
// every real request, so the theme body stays a declared-but-open object and the
// stale page schemas are left for whoever reconciles them with the renderer's
// actual payload. See issues.txt 33.4.
const themeIdParamsSchema = z.object({
  webSurveyThemeId: z.uuid(),
});

const createThemeBodySchema = z.object({
  themeName: z.string().trim().min(1).max(100),
  surveyId: z.uuid().optional(),
});

const renameThemeBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const updateActiveThemeBodySchema = z.object({
  surveyId: z.uuid(),
  theme: z.record(z.string(), z.unknown()),
});

const bySurveyIdSchema = z.object({
  surveyId: z.uuid(),
});

const bySurveyThemeIdSchema = z.object({
  surveyThemeId: z.uuid(),
});

export type surveyThemeSchemaCore = z.infer<typeof surveyThemeSchemaCore>;
export type bySurveyIdSchema = z.infer<typeof bySurveyIdSchema>;
export type bySurveyThemeIdSchema = z.infer<typeof bySurveyThemeIdSchema>;

// Auto-exported after fastify-zod migration
export {
  surveyThemeSchemaCore,
  bySurveyIdSchema,
  bySurveyThemeIdSchema,
  themeIdParamsSchema,
  createThemeBodySchema,
  renameThemeBodySchema,
  updateActiveThemeBodySchema,
};
