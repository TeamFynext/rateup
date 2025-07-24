import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  CampaignType,
  SentCampaignEnum,
} from "../../types/enums";

const coreCampaignSchema = z
  .object({
    name: z.string(),
    type: z.nativeEnum(CampaignType),
    teamId: z.string(),
    waTemplateId: z.string().optional(),
    flowId: z.string().optional(),
    whatsappSettingsPhoneId: z.string(),
    dripStages: z
      .array(
        z.object({
          templateId: z.string().uuid(),
          delay: z.number(),
          delayUnit: z.string(),
          sendAtTime: z.string().optional(),
        }),
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === CampaignType.DRIP) {
        return Array.isArray(data.dripStages) && data.dripStages.length > 0;
      } else {
        return !!data.waTemplateId;
      }
    },
    {
      message:
        "If type is DRIP, dripStages is required with at least one item. Otherwise, waTemplateId is required.",
      path: ["type"],
    },
  );

const createCampaignInputSchema = coreCampaignSchema;

const updateCampaignInputSchema = z.object({
  name: z.string().optional(),
  type: z.nativeEnum(CampaignType).optional(),
  waTemplateId: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  startedAt: z.coerce.date().optional(),
  campaignSentAt: z.date().optional().nullable(),
  scheduledStatuses: z
    .array(z.nativeEnum(CampaignParticipantStatus))
    .optional()
    .nullable(),
  errorMessage: z.string().optional(),
  dynamicTags: z.array(z.string().nullable()).optional(),
  useUserConsent: z.boolean().optional(),
  whatsappSettingsPhoneId: z.string().optional(),
  dripStages: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        templateId: z.string().uuid(),
        delay: z.number(),
        delayUnit: z.string(),
        sendAtTime: z.string().optional(),
      }),
    )
    .optional(),
});

const byCampaignIdParamsSchema = z.object({
  campaignId: z.string(),
});
const byFlowIdParamsSchema = z.object({
  flowId: z.string(),
});

const getCampaignsQuerySchema = z.object({
  campaignId: z.string().optional(),
  teamId: z.string().optional(),
  type: z.nativeEnum(CampaignType).optional(),
});
const responseSchema = z.object({
  type: z.string(),
  response: z.any(),
  title: z.string().optional(),
});

const campaignResponseByIdSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  teamId: z.string().uuid(),
  language: z.string(),
  phone: z.string().optional(),
  tag: z.string().optional(),
  responses: z.array(responseSchema),
});

const campaignResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(CampaignType),
  teamId: z.string(),
  waTemplateId: z.string(),
  status: z.nativeEnum(CampaignStatus),
  startedAt: z.date().optional(),
  createdAt: z.date(),
  endedAt: z.date().optional(),
});

const sendCampaignInputSchema = z.object({
  sendToStatuses: z.array(z.nativeEnum(CampaignParticipantStatus)).min(1),
  participantId: z.string().optional(),
  campaignSentAt: z.date().optional().nullable(),
  sentCampaignChoice: z.nativeEnum(SentCampaignEnum),
  status: z.nativeEnum(CampaignStatus).optional().nullable(),
  type: z.string().optional(),
});
export const { schemas: campaignSchemas, $ref: $campaignRef } =
  buildJsonSchemas(
    {
      createCampaignInputSchema,
      byCampaignIdParamsSchema,
      updateCampaignInputSchema,
      getCampaignsQuerySchema,
      campaignResponseSchema,
      sendCampaignInputSchema,
      byFlowIdParamsSchema,
      campaignResponseByIdSchema,
    },
    {
      $id: "campaignSchema",
    },
  );

export type GetCampaignsQuery = z.infer<typeof getCampaignsQuerySchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignInputSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;
export type ByCampaignIdParams = z.infer<typeof byCampaignIdParamsSchema>;
export type SendCampaignInput = z.infer<typeof sendCampaignInputSchema>;
export type ByFlowIdParams = z.infer<typeof byFlowIdParamsSchema>;
export type CampaignResponseByIdSchema = z.infer<
  typeof campaignResponseByIdSchema
>;
