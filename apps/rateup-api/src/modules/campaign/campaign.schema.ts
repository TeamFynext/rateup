import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { CampaignStatus, CampaignType } from "../../types/enums";

const coreCampaignSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(CampaignType),
  teamId: z.string(),
  waTemplateId: z.string(),
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
