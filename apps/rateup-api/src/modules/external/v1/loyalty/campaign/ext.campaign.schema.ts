import { buildJsonSchemas } from "fastify-zod";
import {
  createLCampaignSchema,
  lCampaignSchema,
  updateLCampaignSchema,
  byCampaignIdParamsSchema,
} from "../../../../loyalty/internal/campaign/campaign.schema";

export const { schemas: loyaltyCampaignExternalSchemas, $ref: $extLCSchema } =
  buildJsonSchemas(
    {
      createLCampaignSchema,
      lCampaignSchema,
      updateLCampaignSchema,
      byCampaignIdParamsSchema,
    },
    { $id: "extLoyaltyCampaignSchema" },
  );
