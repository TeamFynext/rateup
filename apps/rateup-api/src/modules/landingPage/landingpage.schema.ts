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

export const { schemas: landingPageSchemas, $ref: $Sref } = buildJsonSchemas(
  {
    createSurveyRequestSchema,
    getLandingPageByIdParamsSchema,

  },
  { $id: "landingPageSchema" }
);

export type CreateLandingPageInput = z.infer<typeof createSurveyRequestSchema>;
    export type GetLandingPageByIdParams = z.infer<typeof getLandingPageByIdParamsSchema>;

