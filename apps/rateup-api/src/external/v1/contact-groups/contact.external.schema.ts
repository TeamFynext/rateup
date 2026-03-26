import { z } from "zod";
import { contactCoreSchema } from "../../../modules/contact/contact.schema.js";

const createContactSchema = contactCoreSchema.omit({ source: true });
const createMultipleContactSchema = z.array(createContactSchema);
const contactResponseSchema = createContactSchema.extend({
  id: z.string(),
  createdAt: z.string(),
});

export type ExtCreateContactSchema = z.infer<typeof createContactSchema>;

// Auto-exported after fastify-zod migration
export {
  createContactSchema,
  createMultipleContactSchema,
  contactResponseSchema,
};
