import { z } from "zod";

import { QuestionType, ResponseSummaryType, SurveyType } from "../../types/enums.js";
import { ResponsePlatform } from "../../../generated/prisma/client.js";
import { spreadsheetExportFormatSchema } from "../../utils/spreadsheet.js";

// Individual question response
const questionResponseSchema = z.object({
  questionId: z.string(),
  type: z.enum(QuestionType),
  response: z.partialRecord(z.enum(QuestionType), z.any()),
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
      .optional(),
  }),
  encryptedResponses: z.string().optional(),
  shouldRaiseTicket: z.boolean().optional(),
  checkUniqueDevice: z.boolean().optional(),
  selectedColumnId: z.string().optional().nullable(),
};

const createResponseInputSchema = z.object({
  ...responseCore,
  platform: z.enum(ResponsePlatform).optional(),
  tag: z.string().optional().nullable(),
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
  surveyTeamMapId: z.string().optional(),
  surveyId: z.uuid(),
});
const getResponsesBySurveyParamsSchema = z.object({
  orgId: z.uuid().optional(),
  surveyId: z.uuid().optional(),
});
const getResponsesBodySchema = z.object({
  surveyId: z.string().optional(),
});

const getSurveyListResponseSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(SurveyType),
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
  format: spreadsheetExportFormatSchema.default("xlsx"),
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

const summarizeSchema = z.object({
  type: z.enum(ResponseSummaryType),
  questionId: z.string(),
  teamId: z.string().optional(),
});

const responseFilterQuery = z
  .object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    tag: z.string().optional(),
    language: z.string().optional(),
    surveyTeamMapIds: z.string().optional(),
    contactIds: z.string().optional(),
    dateRange: z.string().optional(),
    campaignIds: z.string().optional(),
  })
  .catchall(z.any());

export type CreateResponseInput = z.infer<typeof createResponseInputSchema>;
export type GetResponsesParams = z.infer<typeof getResponsesParamsSchema>;
export type IdInputParams = z.infer<typeof idInputParamsSchema>;
export type DeleteResponseParamsSchema = z.infer<typeof deleteResponseParamsSchema>;
export type GenerateBodyInput = z.infer<typeof generateBodySchema>;
export type getResponsesBody = z.infer<typeof getResponsesBodySchema>;
export type generateXlsxBody = z.infer<typeof generateXlsxSchema>;
export type SummarizeInput = z.infer<typeof summarizeSchema>;
export type ResponseFilterQuery = z.infer<typeof responseFilterQuery>;

// Auto-exported after fastify-zod migration
export {
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
};
