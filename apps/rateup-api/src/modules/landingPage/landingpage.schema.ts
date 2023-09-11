import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import { questionSchema } from "../question/question.schema";

const landingPageCore = {
  title: z.string({
    required_error: "Title is required",
    invalid_type_error: "Title must be a string",
  }),
  surveys: z.array(z.string()),
 
};
const createSurveyRequestSchema = z.object({
  ...landingPageCore,
});

const getLandingPageByIdParamsSchema = z.object({
    id: z.string(),
  });
  const getLandingpagePublicResponseSchema = z.object({
    title: z.string(),
    suveys:z.any()
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

export const { schemas: landingPageSchemas, $ref: $Sref } = buildJsonSchemas(
  {
    createSurveyRequestSchema,
    getLandingPageByIdParamsSchema,
    getLandingpagePublicResponseSchema,
    updateLandingPageRequestSchema

  },
  { $id: "landingPageSchema" }
);



export type CreateLandingPageInput = z.infer<typeof createSurveyRequestSchema>;
export type UpdateLandingPageInput = z.infer<typeof updateLandingPageRequestSchema>;
    export type GetLandingPageByIdParams = z.infer<typeof getLandingPageByIdParamsSchema>;

