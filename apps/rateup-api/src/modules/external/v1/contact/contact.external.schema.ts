import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { contactCoreSchema } from "../../../contact/contact.schema.js";

const createContactSchema = contactCoreSchema.omit({ source: true });
const createMultipleContactSchema = z.array(createContactSchema);
const contactResponseSchema = createContactSchema.extend({
  id: z.string(),
  createdAt: z.string(),
});

export const { schemas: extContactSchemas, $ref: $extContactSchema } =
  buildJsonSchemas(
    {
      createContactSchema,
      createMultipleContactSchema,
      contactResponseSchema,
    },
    {
      $id: "contactExternalSchema",
    },
  );

export type ExtCreateContactSchema = z.infer<typeof createContactSchema>;
