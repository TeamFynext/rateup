import { buildJsonSchemas } from "fastify-zod";
import {
  generateReferralCodeSchema,
  updateLcReferralCodeSchema,
} from "../../../internal/referralCode/referralCode.schema";

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
