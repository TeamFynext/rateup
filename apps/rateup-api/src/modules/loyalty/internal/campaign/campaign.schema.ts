import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { LoyaltyCampaignType } from "../../../../types/enums";

export const byCampaignIdParamsSchema = z.object({
  campaignId: z.string(),
});

export const lCampaignSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  name: z.string(),
  type: z.nativeEnum(LoyaltyCampaignType),
  maxPerReferrer: z.number().optional(),
  marPerUser: z.number().optional(),
  active: z.boolean(),

  referrerRewardId: z.string().optional(),
  userRewardId: z.string().optional(),
  orgId: z.string(),
});

export const createLCampaignSchema = lCampaignSchema.omit({
  id: true,
  createdAt: true,
  orgId: true,
  active: true,
});
export const updateLCampaignSchema = lCampaignSchema
  .omit({ id: true, createdAt: true, orgId: true })
  .partial();

export const { schemas: lCampaignSchemas, $ref: $lCampaignRef } =
  buildJsonSchemas(
    {
      byCampaignIdParamsSchema,
      createLCampaignSchema,
    },
    {
      $id: "loyaltyCampaign",
    },
  );

export type ByCampaignIdParams = z.infer<typeof byCampaignIdParamsSchema>;
export type CreateLCampaignInput = z.infer<typeof createLCampaignSchema>;
