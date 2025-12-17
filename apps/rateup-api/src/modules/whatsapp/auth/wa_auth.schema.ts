import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { MetaLoginAssets } from "../../../types/enums.js";

const registerBusinessBodySchema = z.object({
  code: z.string(),
  phone_number_id: z.string(),
  waba_id: z.string(),
  assets: z.array(z.nativeEnum(MetaLoginAssets)),
});

export type RegisterBusinessBody = z.infer<typeof registerBusinessBodySchema>;

export const { schemas: wa_authSchemas, $ref: $waAuthRef } = buildJsonSchemas(
  {
    registerBusinessBodySchema,
  },
  {
    $id: "wa_authSchemas",
  },
);
