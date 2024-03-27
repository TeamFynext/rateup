import { FastifyInstance } from "fastify/types/instance";
import { createReferralCodeHandler } from "../../../internal/referralCode/referralCode.controller";
import { $extRefCodeRef } from "./ext.refCode.schema";
import { generateReferralCodeHandler } from "./ext.refCode.controller";

export async function externalLoyaltyReferralCodeRoutes(
  server: FastifyInstance,
) {
  server.post(
    "/",
    {
      schema: {
        description: "Create referral code",
        tags: ["Loyalty ReferralCode"],
        body: $extRefCodeRef("generateReferralCodeSchema"),
      },
    },
    generateReferralCodeHandler,
  );
}
