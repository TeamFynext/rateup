import { z } from "zod";
import { MetaLoginAssets } from "../../../types/enums.js";

const registerBusinessBodySchema = z.object({
  code: z.string(),
  phone_number_id: z.string(),
  waba_id: z.string(),
  assets: z.array(z.enum(MetaLoginAssets)),
});

export type RegisterBusinessBody = z.infer<typeof registerBusinessBodySchema>;

// Auto-exported after fastify-zod migration
export { registerBusinessBodySchema };
