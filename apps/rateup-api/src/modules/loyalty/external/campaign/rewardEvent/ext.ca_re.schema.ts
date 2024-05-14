import { buildJsonSchemas } from "fastify-zod";
import { createCaRewardEventBody } from "../../../internal/campaignRewardEvent/ca_re.schema";

export const { schemas: extLCaReEventSchema, $ref: $extLCaReEventRef } =
  buildJsonSchemas(
    {
      createCaRewardEventBody,
    },
    {
      $id: "ext.ca_re",
    },
  );
