import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const surveyCore = {
  title: z.string({
    required_error: "Title is required",
    invalid_type_error: "Title must be a string",
  }),
  languages: z.array(z.string()),
  teamId: z.string({required_error: "TeamId is required"}),
};
const createSurveyRequestSchema = z.object({
  ...surveyCore,
});
const createSurveyResponseSchema = z.object({
  ...surveyCore,
  id: z.string(),
});
const getSurveyByIdParamsSchema = z.object({
  id: z.string(),
});

export const { schemas: surveySchemas, $ref: $Sref } = buildJsonSchemas(
  {
    createSurveyRequestSchema,
    createSurveyResponseSchema,
    getSurveyByIdParamsSchema,
  },
  { $id: "surveySchema" }
);

export type CreateSurveyInput = z.infer<typeof createSurveyRequestSchema>;
export type GetSurveyByIdParams = z.infer<typeof getSurveyByIdParamsSchema>;
