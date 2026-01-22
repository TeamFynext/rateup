import { buildJsonSchemas } from "fastify-zod";
import z from "zod";

export const loyaltyProgramSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  status: z.enum(["draft", "active", "paused"]).default("draft"),
  currencyName: z.string().default("Points"),
  currencyCode: z.string().default("AED"),
  currencySymbol: z.string().default("د.إ"),
  signupBonus: z.number().default(0),
  referralBonus: z.number().default(0),
  refereeBonus: z.number().default(0),
  tiersEnabled: z.boolean().default(true),
  tierResetPeriod: z.enum(["never", "yearly", "monthly"]).optional().nullable(),
});

export const loyaltyProgramUpdateSchema = loyaltyProgramSchema.partial();

export const programIdParamSchema = z.object({
  programId: z.string(),
});

// Response schemas
export const loyaltyProgramResponseSchema = loyaltyProgramSchema.extend({
  id: z.string(),
  orgId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const { schemas: loyaltyProgramSchemas, $ref: $programRef } =
  buildJsonSchemas(
    {
      loyaltyProgramSchema,
      loyaltyProgramUpdateSchema,
      programIdParamSchema,
      loyaltyProgramResponseSchema,
    },
    {
      $id: "loyaltyProgramSchema",
    },
  );

export type LoyaltyProgramInput = z.infer<typeof loyaltyProgramSchema>;
export type LoyaltyProgramUpdateInput = z.infer<
  typeof loyaltyProgramUpdateSchema
>;
export type ProgramIdParam = z.infer<typeof programIdParamSchema>;
export type LoyaltyProgramResponse = z.infer<
  typeof loyaltyProgramResponseSchema
>;
