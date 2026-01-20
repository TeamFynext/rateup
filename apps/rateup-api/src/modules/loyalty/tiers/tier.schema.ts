import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export const loyaltyTierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  threshold: z.number().min(0).default(0),
  pointsMultiplier: z.number().default(1.0),
  color: z.string().default("#999999"),
  benefitsDescription: z.string().optional().nullable(),
  priority: z.number().default(0),
});

export const loyaltyTierUpdateSchema = loyaltyTierSchema.partial();

export const tierIdParamSchema = z.object({
  tierId: z.string(),
});

export const programIdParamSchema = z.object({
  programId: z.string(),
});

export const { schemas: loyaltyTierSchemas, $ref: $tierRef } = buildJsonSchemas(
  {
    loyaltyTierSchema,
    loyaltyTierUpdateSchema,
    tierIdParamSchema,
    programIdParamSchema,
  },
  {
    $id: "loyaltyTierSchema",
  },
);

export type LoyaltyTierInput = z.infer<typeof loyaltyTierSchema>;
export type LoyaltyTierUpdateInput = z.infer<typeof loyaltyTierUpdateSchema>;
export type TierIdParam = z.infer<typeof tierIdParamSchema>;
export type ProgramIdParamTier = z.infer<typeof programIdParamSchema>;
