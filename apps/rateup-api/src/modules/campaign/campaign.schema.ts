import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import {
  CampaignParticipantStatus,
  CampaignStatus,
  CampaignType,
} from "../../types/enums";

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
const sendCampaignInputSchema = z.object({
  sendToStatuses: z.array(z.nativeEnum(CampaignParticipantStatus)),
});
export const { schemas: campaignSchemas, $ref: $campaignRef } =
  buildJsonSchemas(
    {
      createCampaignInputSchema,
      byCampaignIdParamsSchema,
      updateCampaignInputSchema,
      getCampaignsQuerySchema,
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
