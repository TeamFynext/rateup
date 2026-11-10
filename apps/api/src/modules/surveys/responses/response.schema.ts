import { z } from "zod";

import { QuestionType, ResponseSummaryType } from "../../../types/enums.js";
import { ResponsePlatform } from "../../../generated/prisma/client.js";
import { spreadsheetExportFormatSchema } from "../../../utils/spreadsheet.js";

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
  checkUniqueDevice: z.boolean().optional(),
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
  /** See SurveyResponse.idempotencyKey — repeat submissions with the same key collapse. */
  idempotencyKey: z.string().optional(),
});

/**
 * What an anonymous respondent may send to `POST /api/public/response`. Narrower than the
 * internal input: the platform is the server's to decide (a client-chosen `WHATSAPP` used
 * to skip the response allowance), `contactId`/`phone` would attach the answers to an
 * arbitrary contact, and `idempotencyKey` is only honoured from the authenticated WhatsApp
 * Flow path, where it is a signed flow token. Zod strips the dropped keys.
 */
const createPublicResponseInputSchema = createResponseInputSchema.omit({
  platform: true,
  contactId: true,
  phone: true,
  idempotencyKey: true,
  deviceData: true,
});

const getResponsesParamsSchema = z.object({
  surveyTeamMapId: z.string().optional(),
  surveyId: z.uuid(),
});
const getResponsesBodySchema = z.object({
  surveyId: z.string().optional(),
});

const idInputParamsSchema = z.object({
  id: z.string(),
});

const deleteResponseParamsSchema = z.object({
  id: z.uuid(),
  surveyTeamMapId: z.uuid(),
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

/**
 * Query keys the response listing understands by name. Every other key is a per-question
 * answer filter: the key is the question id (a uuid for web surveys, the flow element name
 * for v2 WhatsApp flows) and the value is the search text.
 */
export const RESPONSE_FILTER_RESERVED_KEYS = [
  "page",
  "limit",
  "tag",
  "language",
  "surveyTeamMapIds",
  "contactIds",
  "dateRange",
  "campaignIds",
  "mobile",
  "desc",
  "createdAt",
] as const;

const QUESTION_FILTER_KEY = /^[\w.-]{1,200}$/;
const FILTER_TEXT_MAX = 500;

/** A comma-separated list of uuids, as the dashboard sends `filterTeams.join(",")`. */
const uuidList = z
  .string()
  .max(20_000)
  .transform((value) =>
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.uuid()).max(500));

const responseFilterQuery = z
  .object({
    page: z.coerce.number().int().min(0).optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    tag: z.string().max(FILTER_TEXT_MAX).optional(),
    language: z.string().max(FILTER_TEXT_MAX).optional(),
    surveyTeamMapIds: uuidList.optional(),
    contactIds: uuidList.optional(),
    dateRange: z.string().max(200).optional(),
    campaignIds: uuidList.optional(),
    mobile: z.string().max(FILTER_TEXT_MAX).optional(),
    desc: z.enum(["true", "false"]).optional(),
    createdAt: z.string().max(100).optional(),
  })
  .catchall(z.string().max(FILTER_TEXT_MAX))
  .superRefine((query, ctx) => {
    for (const key of Object.keys(query)) {
      if ((RESPONSE_FILTER_RESERVED_KEYS as readonly string[]).includes(key)) continue;
      if (!QUESTION_FILTER_KEY.test(key)) {
        ctx.addIssue({ code: "custom", path: [key], message: "Unknown filter" });
      }
    }
  });

export type CreateResponseInput = z.infer<typeof createResponseInputSchema>;
export type CreatePublicResponseInput = z.infer<typeof createPublicResponseInputSchema>;
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
  createPublicResponseInputSchema,
  getResponsesParamsSchema,
  idInputParamsSchema,
  deleteResponseParamsSchema,
  generateBodySchema,
  getResponsesBodySchema,
  generateXlsxSchema,
  summarizeSchema,
  responseFilterQuery,
};
