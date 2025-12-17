import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import {
  CampaignType,
  CampaignStatus,
  CampaignParticipantStatus,
} from "../../../../../../types/enums.js";

const coreCampaignSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(CampaignType),
  teamId: z.string(),
  waTemplateId: z.string(),
  flowId: z.string().optional(),
});

const createCampaignInputSchema = coreCampaignSchema;

const updateCampaignInputSchema = z.object({
  name: z.string().optional(),
  type: z.nativeEnum(CampaignType).optional(),
  waTemplateId: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  startedAt: z.coerce.date().optional(),
});

const byCampaignIdParamsSchema = z.object({
  campaignId: z.string(),
});

const getCampaignsQuerySchema = z.object({
  campaignId: z.string().optional(),
  teamId: z.string().optional(),
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
  sendToStatuses: z.array(z.nativeEnum(CampaignParticipantStatus)),
  participantId: z.string().optional(),
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
export const { schemas: campaignSchemas, $ref: $campaignRef } =
  buildJsonSchemas(
    {
      createCampaignInputSchema,
      byCampaignIdParamsSchema,
      updateCampaignInputSchema,
      getCampaignsQuerySchema,
      campaignResponseSchema,
      sendCampaignInputSchema,
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
export type CampaignResponseByIdSchema = z.infer<
  typeof campaignResponseByIdSchema
>;
