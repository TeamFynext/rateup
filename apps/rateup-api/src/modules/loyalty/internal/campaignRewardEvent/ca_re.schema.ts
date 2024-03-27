import { LCampaignRewardEvent } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const byCampaignRewardEventIdParamsSchema = z.object({
  campaignRewardEventId: z.string(),
});
export const createCaRewardEventBody = z.object({
  referralCode: z.string().optional(),
  phone: z
    .string()
    .describe(
      "Phone number of the customer. Must include country code ('+91999888777')",
    ),
  transactionAmount: z.number().min(0).optional(),
});

export const {
  schemas: lCampaignRewardEventSchema,
  $ref: $campaignRewardEvent,
} = buildJsonSchemas(
  {
    byCampaignRewardEventIdParamsSchema,
  },
  {
    $id: "ca_re",
  },
);

export type byCampaignRewardEventIdParams = z.infer<
  typeof byCampaignRewardEventIdParamsSchema
>;
export type CreateCaRewardEventInput = Omit<
  LCampaignRewardEvent,
  "id" | "createdAt"
>;
export type CreateCaRewardEventBody = z.infer<typeof createCaRewardEventBody>;
