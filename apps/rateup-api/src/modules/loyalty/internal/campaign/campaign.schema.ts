import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const byCampaignIdParamsSchema = z.object({
  campaignId: z.string(),
});

export const { schemas: lCampaignSchemas, $ref: $lCampaignRef } =
  buildJsonSchemas(
    {
      byCampaignIdParamsSchema,
    },
    {
      $id: "loyaltyCampaign",
    },
  );

export type ByCampaignIdParams = z.infer<typeof byCampaignIdParamsSchema>;
