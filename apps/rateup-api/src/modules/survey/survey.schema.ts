import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import { questionSchema } from "../question/question.schema";

const surveyCore = {
  title: z.string({
    required_error: "Title is required",
    invalid_type_error: "Title must be a string",
  }),
  languages: z.array(z.string()),
  teamId: z.string({ required_error: "TeamId is required" }),
  active: z.boolean().default(true),
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

const getSurveyPublicResponseSchema = z.object({
  title: z.string(),
  languages: z.array(z.string()),
  active: z.boolean(),
  questions: z.array(questionSchema)
})
const updateSurveyRequestSchema = z.object({
  title: z.string({
    required_error: "Title is required",
    invalid_type_error: "Title must be a string",
  }).optional(),
  languages: z.array(z.string()).optional(),
  active: z.boolean().default(true).optional(),
})

export const { schemas: surveySchemas, $ref: $Sref } = buildJsonSchemas(
  {
    createSurveyRequestSchema,
    createSurveyResponseSchema,
    getSurveyByIdParamsSchema,
    updateSurveyRequestSchema,
    getSurveyPublicResponseSchema
  },
  { $id: "surveySchema" }
);

export type CreateSurveyInput = z.infer<typeof createSurveyRequestSchema>;
export type GetSurveyByIdParams = z.infer<typeof getSurveyByIdParamsSchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveyRequestSchema>;
