import { z } from "zod";
import { contactCoreSchema } from "../../../modules/contact/contact.schema.js";

const createContactSchema = contactCoreSchema.omit({ source: true });
const createMultipleContactSchema = z.array(createContactSchema);
/**
 * A stored contact, as v1 lists a group's members. The input schema it used to reuse requires
 * `name` and types every optional column as a string, but a WhatsApp contact is usually stored
 * with `name: null`, so the serializer refused nearly every real group. Same fields, typed as
 * the table holds them.
 */
const nullableText = z.string().nullable().optional();
const contactResponseSchema = z.object({
  id: z.string(),
  createdAt: z.union([z.date(), z.string()]),
  name: nullableText,
  phone: nullableText,
  email: nullableText,
  address: nullableText,
  dob: z.union([z.date(), z.string()]).nullable().optional(),
  external_id: nullableText,
  igsId: nullableText,
  psid: nullableText,
  notes: nullableText,
  lifecycleId: nullableText,
  customFields: z.array(z.object({ id: z.string(), value: z.string() }).loose()).optional(),
});

export type ExtCreateContactSchema = z.infer<typeof createContactSchema>;

// Auto-exported after fastify-zod migration
export { createContactSchema, createMultipleContactSchema, contactResponseSchema };
