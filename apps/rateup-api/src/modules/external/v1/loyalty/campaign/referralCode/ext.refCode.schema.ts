import { buildJsonSchemas } from "fastify-zod";
import {
  generateReferralCodeSchema,
  updateLcReferralCodeSchema,
} from "../../../../../loyalty/internal/referralCode/referralCode.schema";

export const { schemas: extRefCodeSchema, $ref: $extRefCodeRef } =
  buildJsonSchemas(
    {
      generateReferralCodeSchema,
      updateLcReferralCodeSchema,
    },
    {
      $id: "ext.refCode",
    },
  );
