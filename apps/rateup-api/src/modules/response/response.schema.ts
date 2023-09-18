import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import { QuestionType } from "../../types/enums";
import { ResponsePlatform } from "@prisma/client";


// Individual question response
const questionResponseSchema = z.object({
  questionId: z.string(),
  type: z.nativeEnum(QuestionType),
  response: z.record(z.nativeEnum(QuestionType), z.any()),
});

// Survey response
const responseCore = {
  surveyId: z.string(),
  language: z.string(),
  responses: z.array(questionResponseSchema),
  location: z.object({
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional().default(undefined),
  })
};

const createResponseInputSchema = z.object({
  ...responseCore,
  platform: z.nativeEnum(ResponsePlatform).optional(),
  phone: z.string().optional(),
});

const getResponsesParamsSchema = z.object({
  surveyId: z.string(),
});

const idInputParamsSchema = z.object({
  id: z.string(),
});

const deleteResponseParamsSchema = z.object({
  id: z.string(),
  surveyId: z.string(),
});

export const { schemas: responseSchemas, $ref: $Rref } = buildJsonSchemas({
  createResponseInputSchema,
  getResponsesParamsSchema,
  idInputParamsSchema,
  deleteResponseParamsSchema
});

export type CreateResponseInput = z.infer<typeof createResponseInputSchema>;
export type GetResponsesParams = z.infer<typeof getResponsesParamsSchema>;
export type IdInputParams = z.infer<typeof idInputParamsSchema>;
export type DeleteResponseParamsSchema = z.infer<typeof deleteResponseParamsSchema>;
