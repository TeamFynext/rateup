import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import {
  QuestionType,
  ResponseSummaryType,
  SurveyType,
} from "../../types/enums";
import { ResponsePlatform } from "@prisma/client";

// Individual question response
const questionResponseSchema = z.object({
  questionId: z.string(),
  type: z.nativeEnum(QuestionType),
  response: z.record(z.nativeEnum(QuestionType), z.any()),
});

// Survey response
const responseCore = {
  surveyTeamMapId: z.string(),
  language: z.string(),
  responses: z.array(questionResponseSchema),
  location: z.object({
    coordinates: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional()
      .default(undefined),
  }),
  encryptedResponses: z.string().optional(),
  shouldRaiseTicket: z.boolean().optional(),
  checkUniqueDevice: z.boolean().optional(),
  selectedColumnId: z.string().optional(),
};

const createResponseInputSchema = z.object({
  ...responseCore,
  platform: z.nativeEnum(ResponsePlatform).optional(),
  tag: z.string().optional(),
  deviceData: z
    .object({
      brand: z.string().optional(),
      designName: z.string().optional(),
      name: z.string().optional(),
      yearClass: z.number().optional(),
      manufacturer: z.string().optional(),
      modelId: z.string().optional(),
      modelName: z.string().optional(),
      osBuildId: z.string().optional(),
      osInternalBuildId: z.string().optional(),
      osName: z.string().optional(),
      osVersion: z.string().optional(),
      totalMemory: z.number().optional(),
      getUpTime: z.number().optional(),
      ipaddress: z.string().optional(),
      uniqueId: z.string().optional(),
    })
    .optional(),
  phone: z.string().optional(),
  contactId: z.string().optional(),
});

const getResponsesParamsSchema = z.object({
  surveyTeamMapId: z.string(),
  surveyId: z.string().uuid().optional(),
});
const getResponsesBySurveyParamsSchema = z.object({
  orgId: z.string().uuid().optional(),
  surveyId: z.string().uuid().optional(),
});
const getResponsesBodySchema = z.object({
  surveyId: z.string().optional(),
});

const getSurveyListResponseSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  type: z.nativeEnum(SurveyType),
});

const idInputParamsSchema = z.object({
  id: z.string(),
});

const deleteResponseParamsSchema = z.object({
  id: z.string(),
  surveyTeamMapId: z.string(),
});

const generateBodySchema = z.object({
  surveyTeamMapId: z.string(),
  batchSize: z.number(),
});
const generateXlsxSchema = z.object({
  surveyId: z.string().min(1),
  defaultLanguage: z.string(),
  visibleColumn: z.array(z.string()),
  tz: z.string().default("Asia/Calcutta"),
  filterTeams: z.array(z.string()),
  campaignIds: z.array(z.string()),
  dbFlowId: z.string().optional(),
  columnFilters: z.array(
    z.object({
      id: z.string().optional(),
      value: z.string().optional(),
    }),
  ),
  ranges: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    key: z.string().optional(),
  }),
});

export const summarizeSchema = z.object({
  type: z.nativeEnum(ResponseSummaryType),
  questionId: z.string(),
  teamId: z.string().optional(),
});

const responseFilterQuery = z
  .object({
    page: z.number().optional(),
    limit: z.number().optional(),
    tag: z.string().optional(),
    language: z.string().optional(),
    surveyTeamMapIds: z.string().optional(),
    contactIds: z.string().optional(),
    dateRange: z.string().optional(),
    campaignIds: z.string().optional(),
  })
  .catchall(z.any());

export const { schemas: responseSchemas, $ref: $Rref } = buildJsonSchemas({
  createResponseInputSchema,
  getResponsesParamsSchema,
  idInputParamsSchema,
  deleteResponseParamsSchema,
  generateBodySchema,
  getResponsesBodySchema,
  generateXlsxSchema,
  summarizeSchema,
  getResponsesBySurveyParamsSchema,
  getSurveyListResponseSchema,
  responseFilterQuery,
});

export type CreateResponseInput = z.infer<typeof createResponseInputSchema>;
export type GetResponsesParams = z.infer<typeof getResponsesParamsSchema>;
export type IdInputParams = z.infer<typeof idInputParamsSchema>;
export type DeleteResponseParamsSchema = z.infer<
  typeof deleteResponseParamsSchema
>;
export type GenerateBodyInput = z.infer<typeof generateBodySchema>;
export type getResponsesBody = z.infer<typeof getResponsesBodySchema>;
export type generateXlsxBody = z.infer<typeof generateXlsxSchema>;
export type SummarizeInput = z.infer<typeof summarizeSchema>;
export type ResponseFilterQuery = z.infer<typeof responseFilterQuery>;
