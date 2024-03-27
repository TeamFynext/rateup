import { buildJsonSchemas } from "fastify-zod";
import {
  byCampaignIdParamsSchema,
  createLCampaignSchema,
  updateLCampaignSchema,
  lCampaignSchema,
} from "../../internal/campaign/campaign.schema";

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
