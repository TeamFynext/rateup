import { z } from "zod";
import { MetaLoginAssets } from "../../../../types/enums.js";

/** Meta object ids are numeric; anything else would be spliced into a Graph API path. */
const graphId = z.string().regex(/^\d*$/, "Expected a numeric Meta id");

const registerBusinessBodySchema = z.object({
  code: z.string().min(1),
  phone_number_id: graphId.optional(),
  waba_id: graphId,
  assets: z.array(z.enum(MetaLoginAssets)).default([]),
});

const userTokenBodySchema = z.object({
  code: z.string().min(1),
});

const waSettingsIdParamsSchema = z.object({ waSettingsId: z.uuid() });
const phoneIdParamsSchema = z.object({ phoneId: z.string().min(1) });

export type RegisterBusinessBody = z.infer<typeof registerBusinessBodySchema>;
export type UserTokenBody = z.infer<typeof userTokenBodySchema>;

// Auto-exported after fastify-zod migration
export {
  registerBusinessBodySchema,
  userTokenBodySchema,
  waSettingsIdParamsSchema,
  phoneIdParamsSchema,
};
