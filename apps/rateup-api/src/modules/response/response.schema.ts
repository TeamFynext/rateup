import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import { QuestionType } from "../../types/enums";
import { ResponsePlatform } from "@prisma/client";

const questionResponseSchema = z.object({
  questionId: z.string(),
  type: z.nativeEnum(QuestionType),
  response: z.record(z.nativeEnum(QuestionType), z.any()),
});
const responseCore = {
  surveyId: z.string(),
  language: z.string(),
  responses: z.array(questionResponseSchema),
};

const createResponseInputSchema = z.object({
  ...responseCore,
  platform: z.nativeEnum(ResponsePlatform).optional(),
  phone: z.string().optional(),
});

const getResponsesParamsSchema = z.object({
  surveyId: z.string(),
});

export const { schemas: responseSchemas, $ref: $Rref } = buildJsonSchemas({
  createResponseInputSchema,
  getResponsesParamsSchema,
});

export type CreateResponseInput = z.infer<typeof createResponseInputSchema>;
export type GetResponsesParams = z.infer<typeof getResponsesParamsSchema>;
